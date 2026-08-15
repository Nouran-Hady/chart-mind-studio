import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { runIngestion, initialSteps, retrieveContext } from "./documents.server";
import { getVectorStoreConfig } from "./vector/vector-store.server";

export const createDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(200),
        filename: z.string().min(1).max(255),
        file_type: z.string().max(120).default("text/plain"),
        file_size: z.number().int().nonnegative().default(0),
        markdown: z.string().default(""),
        original_content: z.string().default(""),
        metadata: z.record(z.any()).default({}),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: doc, error } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        name: data.name,
        filename: data.filename,
        file_type: data.file_type,
        file_size: data.file_size,
        original_content: data.original_content.slice(0, 2_000_000),
        metadata: data.metadata,
        review_status: "pending_review",
        ingestion_status: "not_ingested",
        current_version: 1,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { error: verErr } = await supabase.from("document_versions").insert({
      document_id: doc.id,
      user_id: userId,
      version: 1,
      markdown: data.markdown,
      status: "draft",
      note: "Initial extraction",
    });
    if (verErr) throw new Error(verErr.message);
    return doc;
  });

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("documents")
      .select(
        "id,name,filename,file_type,file_size,review_status,ingestion_status,current_version,active_version,chunk_count,vector_count,created_at,updated_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: doc, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: versions, error: verErr } = await supabase
      .from("document_versions")
      .select("id,version,status,note,created_at,updated_at")
      .eq("document_id", data.id)
      .order("version", { ascending: false });
    if (verErr) throw new Error(verErr.message);
    const { data: latest } = await supabase
      .from("document_versions")
      .select("*")
      .eq("document_id", data.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { document: doc, versions: versions ?? [], latest };
  });

export const getDocumentVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("document_versions")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const saveDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        documentId: z.string().uuid(),
        markdown: z.string().max(2_000_000),
        note: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: latest, error } = await supabase
      .from("document_versions")
      .select("*")
      .eq("document_id", data.documentId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (latest && latest.status === "draft") {
      const { error: upErr } = await supabase
        .from("document_versions")
        .update({ markdown: data.markdown, note: data.note ?? latest.note })
        .eq("id", latest.id);
      if (upErr) throw new Error(upErr.message);
      return { version: latest.version, created: false };
    }

    const nextVersion = (latest?.version ?? 0) + 1;
    const { error: insErr } = await supabase.from("document_versions").insert({
      document_id: data.documentId,
      user_id: userId,
      version: nextVersion,
      markdown: data.markdown,
      status: "draft",
      note: data.note ?? "Revision",
    });
    if (insErr) throw new Error(insErr.message);
    await supabase
      .from("documents")
      .update({ current_version: nextVersion, review_status: "pending_review" })
      .eq("id", data.documentId);
    return { version: nextVersion, created: true };
  });

export const approveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        documentId: z.string().uuid(),
        markdown: z.string().max(2_000_000),
        note: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: latest } = await supabase
      .from("document_versions")
      .select("*")
      .eq("document_id", data.documentId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    let versionNumber = latest?.version ?? 1;
    if (latest && latest.status === "draft") {
      const { error } = await supabase
        .from("document_versions")
        .update({ markdown: data.markdown, status: "approved", note: data.note ?? "Approved" })
        .eq("id", latest.id);
      if (error) throw new Error(error.message);
    } else {
      versionNumber = (latest?.version ?? 0) + 1;
      const { error } = await supabase.from("document_versions").insert({
        document_id: data.documentId,
        user_id: userId,
        version: versionNumber,
        markdown: data.markdown,
        status: "approved",
        note: data.note ?? "Approved",
      });
      if (error) throw new Error(error.message);
    }

    const { error: docErr } = await supabase
      .from("documents")
      .update({
        review_status: "approved",
        current_version: versionNumber,
        ingestion_progress: initialSteps(),
      })
      .eq("id", data.documentId);
    if (docErr) throw new Error(docErr.message);
    return { version: versionNumber };
  });

export const rejectDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ documentId: z.string().uuid(), reason: z.string().max(500).optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("documents")
      .update({ review_status: "rejected", ingestion_error: data.reason ?? null })
      .eq("id", data.documentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restoreVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ documentId: z.string().uuid(), versionId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: source, error } = await supabase
      .from("document_versions")
      .select("*")
      .eq("id", data.versionId)
      .single();
    if (error) throw new Error(error.message);
    const { data: latest } = await supabase
      .from("document_versions")
      .select("version")
      .eq("document_id", data.documentId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (latest?.version ?? 0) + 1;
    const { error: insErr } = await supabase.from("document_versions").insert({
      document_id: data.documentId,
      user_id: userId,
      version: nextVersion,
      markdown: source.markdown,
      status: "draft",
      note: `Restored from v${source.version}`,
    });
    if (insErr) throw new Error(insErr.message);
    await supabase
      .from("documents")
      .update({ current_version: nextVersion, review_status: "pending_review" })
      .eq("id", data.documentId);
    return { version: nextVersion };
  });

export const ingestDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ documentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    return await runIngestion(context.supabase, context.userId, data.documentId);
  });

export const getIngestionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ documentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("documents")
      .select("ingestion_status,ingestion_progress,ingestion_error,chunk_count,vector_count,vector_index,vector_namespace,active_version")
      .eq("id", data.documentId)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getVectorConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => getVectorStoreConfig());

export const searchKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        query: z.string().min(1).max(2000),
        topK: z.number().int().min(1).max(20).default(6),
        documentIds: z.array(z.string().uuid()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    return await retrieveContext(context.userId, data.query, {
      topK: data.topK,
      documentIds: data.documentIds,
    });
  });
