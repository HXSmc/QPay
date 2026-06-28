"use client";

// Admin editor for structured, orderable menu items (optional feature). When an
// admin adds items here, diners get an "Order food" button in the customer view.
// Leaving it empty keeps the PDF/image menu as the only diner-facing menu.

import { useEffect, useState } from "react";
import {
  createMenuItem,
  deleteMenuItem,
  getSettings,
  listMenuItems,
  updateMenuItem,
} from "../../lib/api";
import { fmt, type Currency } from "../../lib/data";
import { C, R, S, T, STATUS, MONO, btn, field } from "../../lib/theme";
import { Alert, EmptyState, Skeleton, Spinner } from "../ui/Primitives";
import type { MenuItem } from "../../lib/types";

export function MenuItemsEditor() {
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", category: "", description: "" });
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    listMenuItems()
      .then(setItems)
      .catch(() => setItems([]));
    getSettings().then((s) => setCurrency(s.currency)).catch(() => {});
  }, []);

  const add = async () => {
    const price = parseFloat(form.price);
    if (!form.name.trim() || !(price >= 0)) {
      setError("Enter a name and a valid price.");
      return;
    }
    setAdding(true);
    setError("");
    try {
      const created = await createMenuItem({
        name: form.name.trim(),
        price: +price.toFixed(2),
        category: form.category.trim(),
        description: form.description.trim(),
      });
      setItems((cur) => [...(cur ?? []), created]);
      setForm({ name: "", price: "", category: "", description: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add item.");
    } finally {
      setAdding(false);
    }
  };

  const toggle = async (it: MenuItem) => {
    const next = !it.available;
    setItems((cur) => cur!.map((x) => (x.id === it.id ? { ...x, available: next } : x)));
    try {
      await updateMenuItem(it.id, { available: next });
    } catch {
      setItems((cur) => cur!.map((x) => (x.id === it.id ? { ...x, available: it.available } : x)));
    }
  };

  const remove = async (id: string) => {
    const prev = items;
    setItems((cur) => cur!.filter((x) => x.id !== id));
    try {
      await deleteMenuItem(id);
    } catch {
      setItems(prev);
    }
  };

  const saveEdit = async (id: string, patch: Partial<MenuItem>) => {
    const updated = await updateMenuItem(id, patch);
    setItems((cur) => cur!.map((x) => (x.id === id ? updated : x)));
    setEditId(null);
  };

  return (
    <div>
      {/* Add form */}
      <div style={{ ...card(), padding: S[5] }}>
        <div style={{ ...T.h3, marginBottom: S[3] }}>Add an item</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: S[3] }}>
          <input
            placeholder="Item name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={field()}
          />
          <input
            placeholder="Price"
            inputMode="decimal"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            style={field()}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: S[3], marginTop: S[3] }}>
          <input
            placeholder="Category (optional)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            style={field()}
          />
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={field()}
          />
        </div>
        {error && (
          <div style={{ marginTop: S[3] }}>
            <Alert kind="danger">{error}</Alert>
          </div>
        )}
        <button
          className="qp-cta qp-press"
          onClick={add}
          disabled={adding}
          style={{ ...btn("primary", { disabled: adding }), marginTop: S[4] }}
        >
          {adding ? <Spinner color="#fff" /> : "Add item"}
        </button>
      </div>

      {/* List */}
      <div style={{ marginTop: S[5] }}>
        {items === null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: S[2] }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} h={64} radius={R.md} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No orderable items yet"
            body="Adding items is optional. When you add some, diners can order and leave notes (like ‘no cheese’) straight from their phone. Without items, they’ll still see your uploaded menu."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: S[2] }}>
            {items.map((it) =>
              editId === it.id ? (
                <EditRow key={it.id} item={it} onCancel={() => setEditId(null)} onSave={saveEdit} />
              ) : (
                <div
                  key={it.id}
                  style={{
                    ...card({ pad: 14, radius: R.md }),
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    opacity: it.available ? 1 : 0.6,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ ...T.h3 }}>{it.name}</span>
                      {it.category && (
                        <span style={{ ...T.caption, color: C.muted }}>· {it.category}</span>
                      )}
                    </div>
                    {it.description && (
                      <div style={{ ...T.caption, color: C.muted, marginTop: 2 }}>
                        {it.description}
                      </div>
                    )}
                  </div>
                  <div style={{ ...T.h3, ...MONO, color: C.text, minWidth: 72, textAlign: "right" }}>
                    {fmt(it.price, currency)}
                  </div>
                  <button
                    onClick={() => toggle(it)}
                    title={it.available ? "Available. Click to hide." : "Hidden. Click to show."}
                    style={{
                      ...btn("secondary", { size: "sm" }),
                      color: it.available ? STATUS.success.fg : C.muted,
                      borderColor: it.available ? STATUS.success.border : C.border,
                    }}
                  >
                    {it.available ? "Available" : "Hidden"}
                  </button>
                  <button onClick={() => setEditId(it.id)} style={btn("secondary", { size: "sm" })}>
                    Edit
                  </button>
                  <button onClick={() => remove(it.id)} style={btn("danger", { size: "sm" })}>
                    Delete
                  </button>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function card(opts: { pad?: number; radius?: number } = {}): React.CSSProperties {
  return {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: opts.radius ?? R.lg,
    padding: opts.pad ?? S[5],
  };
}

function EditRow({
  item,
  onCancel,
  onSave,
}: {
  item: MenuItem;
  onCancel: () => void;
  onSave: (id: string, patch: Partial<MenuItem>) => Promise<void>;
}) {
  const [f, setF] = useState({
    name: item.name,
    price: String(item.price),
    category: item.category,
    description: item.description,
  });
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ ...card({ pad: 14, radius: R.md }), background: C.surfaceAlt }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: S[2] }}>
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={field()} />
        <input
          value={f.price}
          inputMode="decimal"
          onChange={(e) => setF({ ...f, price: e.target.value })}
          style={field()}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: S[2], marginTop: S[2] }}>
        <input
          value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}
          style={field()}
          placeholder="Category"
        />
        <input
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
          style={field()}
          placeholder="Description"
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: S[3] }}>
        <button
          className="qp-press"
          disabled={busy}
          onClick={async () => {
            const price = parseFloat(f.price);
            if (!f.name.trim() || !(price >= 0)) return;
            setBusy(true);
            await onSave(item.id, {
              name: f.name.trim(),
              price: +price.toFixed(2),
              category: f.category.trim(),
              description: f.description.trim(),
            }).finally(() => setBusy(false));
          }}
          style={btn("primary", { size: "sm", disabled: busy })}
        >
          {busy ? <Spinner color="#fff" /> : "Save"}
        </button>
        <button onClick={onCancel} style={btn("secondary", { size: "sm" })}>
          Cancel
        </button>
      </div>
    </div>
  );
}
