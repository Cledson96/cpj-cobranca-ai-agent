"use client";

import { AlertTriangle, CheckCircle2, Clock3, DollarSign, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { UsageSummary } from "@cpj-cobranca/shared/admin-schemas";
import type { HistoryListItem } from "@cpj-cobranca/shared/case-schemas";
import { getUsageSummary, listExecutions } from "../../src/api-client";
import { AdminShell } from "../../src/components/AdminShell";
import { StatCard } from "../../src/components/StatCard";

export default function AdminDashboardPage() {
  return (
    <AdminShell>
      {(token) => <Dashboard token={token} />}
    </AdminShell>
  );
}

function Dashboard({ token }: { token: string }) {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [executions, setExecutions] = useState<HistoryListItem[]>([]);
  const [status, setStatus] = useState("");

  async function load() {
    setStatus("Atualizando");
    try {
      const [usageSummary, latestExecutions] = await Promise.all([
        getUsageSummary(token),
        listExecutions(token),
      ]);
      setUsage(usageSummary);
      setExecutions(latestExecutions.slice(0, 10));
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro");
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <button type="button" onClick={load}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>
      <div className="stats-grid">
        <StatCard icon={Clock3} label="Requisicoes" value={formatNumber(usage?.request_count)} />
        <StatCard
          icon={CheckCircle2}
          label="Sucessos"
          value={formatNumber(usage?.success_count)}
          tone="green"
        />
        <StatCard
          icon={AlertTriangle}
          label="Falhas"
          value={formatNumber(usage?.failed_count)}
          tone="red"
        />
        <StatCard
          icon={DollarSign}
          label="Custo USD"
          value={formatCurrency(usage?.cost_usd)}
          tone="amber"
        />
      </div>
      <p className="status-line">{status}</p>

      <div className="section-title">
        <h2>Por fluxo</h2>
      </div>
      <div className="table-band">
        <table>
          <thead>
            <tr>
              <th>Fluxo</th>
              <th>Requisicoes</th>
              <th>Custo</th>
            </tr>
          </thead>
          <tbody>
            {(usage?.by_flow ?? []).map((row) => (
              <tr key={row.flow_type}>
                <td>{row.flow_type}</td>
                <td>{row.request_count}</td>
                <td>{formatCurrency(row.cost_usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-title">
        <h2>Ultimas execucoes</h2>
      </div>
      <div className="table-band">
        <table>
          <thead>
            <tr>
              <th>Fluxo</th>
              <th>Status</th>
              <th>Modelo</th>
              <th>Latencia</th>
              <th>Custo</th>
            </tr>
          </thead>
          <tbody>
            {executions.map((execution) => (
              <tr key={execution.id}>
                <td>{execution.type}</td>
                <td>{execution.status}</td>
                <td>{execution.model_used ?? "nao informado"}</td>
                <td>{execution.duration_ms} ms</td>
                <td>{formatCurrency(execution.cost_usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function formatNumber(value: number | undefined): string {
  return value === undefined ? "0" : String(value);
}

function formatCurrency(value: number | null | undefined): string {
  return value == null ? "nao informado" : `$${value.toFixed(6)}`;
}
