export async function onRequestPut({ request, env, params }) {
  const body = await request.json();

  await env.DB.prepare(
    `UPDATE items
     SET category = ?, title = ?, notes = ?, start_date = ?, due_date = ?,
         done = ?, link = ?, photo = ?
     WHERE id = ?`
  )
    .bind(
      body.category,
      body.title,
      body.notes || "",
      body.start_date || null,
      body.due_date || null,
      body.done ? 1 : 0,
      body.link || "",
      body.photo || "",
      params.id
    )
    .run();

  return Response.json({ success: true });
}

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare(`DELETE FROM items WHERE id = ?`).bind(params.id).run();
  return Response.json({ success: true });
}
