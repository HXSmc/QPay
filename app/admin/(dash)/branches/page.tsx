"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  createBranch,
  deleteBranch,
  getSettings,
  listBranches,
  listTables,
  testPosConnection,
  updateBranch,
  type PosTestResult,
} from "../../../lib/api";
import type { Branch, LiveTable } from "../../../lib/types";
import { C, R, S, T, STATUS, badge, btn, card, field } from "../../../lib/theme";
import { Alert, EmptyState, Skeleton, Spinner } from "../../../components/ui/Primitives";
import { POS_SYSTEMS, posConnection, posFields } from "../../../lib/pos";
import { useT } from "../../../lib/i18n-client";

export default function BranchesPage() {
  const tr = useT();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tables, setTables] = useState<LiveTable[]>([]);
  const [defaultPos, setDefaultPos] = useState("");
  const [branchCap, setBranchCap] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const reload = async () => {
    const [b, t] = await Promise.all([listBranches(), listTables()]);
    setBranches(b);
    setTables(t);
  };

  useEffect(() => {
    Promise.all([listBranches(), listTables(), getSettings()])
      .then(([b, t, s]) => {
        setBranches(b);
        setTables(t);
        setDefaultPos(s.posSystem ?? "");
        setBranchCap(s.branches ?? 0);
      })
      .catch(() => setError(tr("Couldn't load your branches. Please refresh.")))
      .finally(() => setLoading(false));
  }, []);

  // The oldest branch owns tables that have no branch assigned yet.
  const defaultBranchId = branches[0]?.id;
  const countFor = (b: Branch, isDefault: boolean) =>
    tables.filter(
      (t) => t.branchId === b.id || (isDefault && (t.branchId == null || t.branchId === "")),
    ).length;

  const addBranch = async () => {
    setAdding(true);
    setError("");
    try {
      // Derive the suffix from the highest existing "Branch N" (not the count),
      // so deleting a middle branch can't produce a duplicate default name.
      const maxNum = branches.reduce((m, b) => {
        const n = Number(/(\d+)\s*$/.exec(b.name)?.[1] ?? 0);
        return Math.max(m, n);
      }, branches.length);
      await createBranch(`${tr("Branch")} ${maxNum + 1}`);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Couldn't add a branch. Please retry."));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="qp-page" style={{ padding: `${S[6]}px ${S[6] + 4}px`, maxWidth: 860 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: S[5],
        }}
      >
        <div>
          <div style={{ ...T.label, color: C.brand, marginBottom: S[1] }}>{tr("Branches")}</div>
          <h1 style={{ ...T.h1, margin: 0, color: C.text }}>{tr("Branches")}</h1>
          <p style={{ ...T.body, color: C.muted, margin: `${S[2]}px 0 0`, maxWidth: 520 }}>
            {tr("Name each location, set its POS branch ID, and manage its tables separately.")}
          </p>
        </div>
        <button
          className="qp-cta-lift"
          onClick={addBranch}
          disabled={adding || (branchCap > 0 && branches.length >= branchCap)}
          title={
            branchCap > 0 && branches.length >= branchCap
              ? tr("Raise the branch count in Settings to add more.")
              : undefined
          }
          style={btn("primary", { size: "sm", disabled: adding || (branchCap > 0 && branches.length >= branchCap) })}
        >
          {adding && <Spinner size={14} color="#fff" />}
          {tr("+ Add branch")}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: S[4] }}>
          <Alert kind="danger">{error}</Alert>
        </div>
      )}

      {loading ? (
        <div style={{ display: "grid", gap: S[4] }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} h={220} radius={R.lg} />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <EmptyState title={tr("No branches yet")} body={tr("Add your first branch to get started.")} />
      ) : (
        <div style={{ display: "grid", gap: S[5] }}>
          {branches.map((b) => (
            <BranchCard
              key={b.id}
              branch={b}
              defaultPos={defaultPos}
              tableCount={countFor(b, b.id === defaultBranchId)}
              canDelete={branches.length > 1}
              onChanged={reload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BranchCard({
  branch,
  defaultPos,
  tableCount,
  canDelete,
  onChanged,
}: {
  branch: Branch;
  defaultPos: string;
  tableCount: number;
  canDelete: boolean;
  onChanged: () => Promise<void>;
}) {
  const tr = useT();
  const [name, setName] = useState(branch.name);
  const [posSystem, setPosSystem] = useState(branch.posSystem || defaultPos || "");
  const [posConfig, setPosConfig] = useState<Record<string, string>>(branch.posConfig ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<PosTestResult | null>(null);
  const [error, setError] = useState("");

  const labelStyle = { ...T.label, color: C.muted, display: "block", marginBottom: S[2] } as const;
  const conn = useMemo(() => posConnection(posSystem, posConfig), [posSystem, posConfig]);

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await updateBranch(branch.id, { name, posSystem, posConfig });
      setName(updated.name);
      setPosSystem(updated.posSystem);
      setPosConfig(updated.posConfig ?? {});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Couldn't save. Please retry."));
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTest(null);
    setError("");
    try {
      // Save first so the test uses the latest (encrypted) credentials.
      await updateBranch(branch.id, { name, posSystem, posConfig });
      setTest(await testPosConnection(branch.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Couldn't test the connection."));
    } finally {
      setTesting(false);
    }
  };

  const remove = async () => {
    setConfirmDel(false);
    setError("");
    try {
      const res = await deleteBranch(branch.id);
      if (!res.ok) {
        setError(tr(res.error));
        return;
      }
      await onChanged();
    } catch {
      setError(tr("Couldn't delete this branch. Please retry."));
    }
  };

  const fields = posFields(posSystem);

  return (
    <div style={card({ pad: S[5] })}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: S[3],
          marginBottom: S[4],
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: S[3], minWidth: 0 }}>
          <span style={{ ...T.h2, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name || tr("Branch")}
          </span>
          <span style={badge("neutral")}>
            {tableCount} {tableCount === 1 ? tr("table") : tr("tables")}
          </span>
        </div>
        <Link
          href={`/admin/tables?branch=${branch.id}`}
          className="qp-cta-lift"
          style={{ ...btn("secondary", { size: "sm" }), textDecoration: "none" }}
        >
          {tr("Manage tables")}
        </Link>
      </div>

      <div>
        <label htmlFor={`bn-${branch.id}`} style={labelStyle}>
          {tr("Branch name")}
        </label>
        <input id={`bn-${branch.id}`} value={name} onChange={(e) => setName(e.target.value)} style={field()} />
      </div>

      <div style={{ borderTop: `1px solid ${C.canvas}`, marginTop: S[4], paddingTop: S[4] }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: S[3], marginBottom: S[2] }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{tr("POS integration")}</div>
          {posSystem && posSystem !== "none" && (
            <span style={badge(conn === "connected" ? "success" : conn === "incomplete" ? "warn" : "neutral")}>
              {conn === "connected" ? tr("Connected") : conn === "incomplete" ? tr("Needs details") : tr("Not set")}
            </span>
          )}
        </div>
        <label htmlFor={`bp-${branch.id}`} style={labelStyle}>
          {tr("POS system")}
        </label>
        <select
          id={`bp-${branch.id}`}
          value={posSystem}
          onChange={(e) => {
            setPosSystem(e.target.value);
            setPosConfig({});
            setTest(null);
          }}
          style={field()}
        >
          {POS_SYSTEMS.map((p) => (
            <option key={p.id} value={p.id === "none" ? "" : p.id}>
              {p.id === "none" ? tr("None") : p.name}
            </option>
          ))}
        </select>

        {fields.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: S[3], marginTop: S[3] }}>
            {fields.map((f) => (
              <div key={f.key}>
                <label htmlFor={`bf-${branch.id}-${f.key}`} style={labelStyle}>
                  {tr(f.label)}
                  {f.required ? "" : ` ${tr("(optional)")}`}
                </label>
                <input
                  id={`bf-${branch.id}-${f.key}`}
                  type={f.secret ? "password" : "text"}
                  autoComplete={f.secret ? "new-password" : "off"}
                  placeholder={f.placeholder ? tr(f.placeholder) : undefined}
                  value={posConfig[f.key] ?? ""}
                  onChange={(e) => {
                    setPosConfig((c) => ({ ...c, [f.key]: e.target.value }));
                    setTest(null);
                  }}
                  style={field()}
                />
              </div>
            ))}
          </div>
        )}

        {test && (
          <div style={{ marginTop: S[3] }}>
            <Alert kind={test.ok ? "success" : test.automated ? "danger" : "info"}>{tr(test.message)}</Alert>
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: S[3] }}>
          <Alert kind="danger">{error}</Alert>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: S[2], marginTop: S[4], flexWrap: "wrap" }}>
        <button onClick={save} disabled={saving} className="qp-cta-lift" style={btn("primary", { size: "sm", disabled: saving })}>
          {saving && <Spinner size={14} color="#fff" />}
          {saved ? tr("Saved") : tr("Save branch")}
        </button>
        {posSystem && posSystem !== "none" && (
          <button onClick={runTest} disabled={testing} className="qp-cta-lift" style={btn("secondary", { size: "sm", disabled: testing })}>
            {testing && <Spinner size={14} />}
            {tr("Test connection")}
          </button>
        )}
        <div style={{ flex: 1 }} />
        {canDelete &&
          (confirmDel ? (
            <>
              <button onClick={remove} className="qp-cta-lift" style={btn("danger", { size: "sm" })}>
                {tr("Confirm delete?")}
              </button>
              <button onClick={() => setConfirmDel(false)} className="qp-cta-lift" style={btn("secondary", { size: "sm" })}>
                {tr("Cancel")}
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="qp-cta-lift" style={btn("danger", { size: "sm" })}>
              {tr("Delete")}
            </button>
          ))}
      </div>
    </div>
  );
}
