"use client";

import { useCallback, useEffect, useState } from "react";

type Plugin = {
  id: string;
  name: string;
  description: string;
  version: string;
  installed: boolean;
  enabled: boolean;
  permissions: string;
};

type Note = {
  id: string;
  title: string;
  content: string;
  source: string;
};

export function PluginsPanel() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/plugins/install");
    const data = await res.json();
    setPlugins(data.catalog ?? []);

    const notesPlugin = (data.catalog ?? []).find(
      (p: Plugin) => p.id === "notes" && p.installed && p.enabled,
    );
    if (notesPlugin) {
      const n = await fetch("/api/plugins/notes");
      if (n.ok) {
        const nd = await n.json();
        setNotes(nd.notes ?? []);
      }
    } else {
      setNotes([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function install(pluginId: string, installed: boolean) {
    await fetch("/api/plugins/install", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pluginId,
        action: installed ? "uninstall" : "install",
      }),
    });
    await load();
  }

  async function setPerm(pluginId: string, permissions: string) {
    await fetch("/api/plugins/install", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pluginId,
        action: "set_permissions",
        permissions,
      }),
    });
    await load();
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/plugins/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    setTitle("");
    setContent("");
    await load();
  }

  const notesInstalled = plugins.find((p) => p.id === "notes")?.installed;

  return (
    <div className="space-y-4">
      <div className="panel p-6">
        <h1 className="display text-3xl font-semibold">Plugins</h1>
        <p className="mt-2 max-w-2xl text-[var(--ink-soft)]">
          Install apps into Synapse. When you grant permission, Jarvis can read
          their data — transcripts, notes, summaries — without opening each app.
        </p>
      </div>

      <div className="grid gap-4">
        {plugins.map((plugin) => (
          <div key={plugin.id} className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {plugin.name}{" "}
                  <span className="text-sm font-normal text-[var(--ink-soft)]">
                    v{plugin.version}
                  </span>
                </h2>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">
                  {plugin.description}
                </p>
              </div>
              <span
                className={`badge ${plugin.installed ? "badge-on" : "badge-off"}`}
              >
                {plugin.installed ? "installed" : "available"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-primary text-sm"
                onClick={() => install(plugin.id, plugin.installed)}
              >
                {plugin.installed ? "Uninstall" : "Install"}
              </button>
              {plugin.installed && (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost text-sm"
                    onClick={() =>
                      setPerm(
                        plugin.id,
                        plugin.permissions.includes("read") ? "none" : "read",
                      )
                    }
                  >
                    Jarvis read:{" "}
                    {plugin.permissions.includes("read") ? "on" : "off"}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {notesInstalled && (
        <div className="panel p-6">
          <h2 className="display text-2xl font-semibold">Notes workspace</h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Add notes or paste transcripts. Jarvis can pull these when permitted.
          </p>
          <form onSubmit={addNote} className="mt-4 space-y-3">
            <input
              className="input"
              placeholder="Note title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              className="textarea"
              placeholder="Content / transcript"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary">
              Save note
            </button>
          </form>
          <div className="mt-6 space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-xl border border-[var(--line)] bg-white/70 p-4"
              >
                <h3 className="font-semibold">{note.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--ink-soft)]">
                  {note.content}
                </p>
              </div>
            ))}
            {!notes.length && (
              <p className="text-sm text-[var(--ink-soft)]">No notes yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
