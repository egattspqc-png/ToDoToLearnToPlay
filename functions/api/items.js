export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM items ORDER BY created_at DESC"
  ).all();
  return Response.json(results);
}

export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const id = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO items (id, category, title, notes, start_date, due_date, done, link, photo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.category,
      body.title,
      body.notes || "",
      body.start_date || null,
      body.due_date || null,
      body.done ? 1 : 0,
      body.link || "",
      body.photo || ""
    )
    .run();

  return Response.json({ id });
}
