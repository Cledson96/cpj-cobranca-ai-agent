"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { ExecutionDetail, HistoryListItem } from "@cpj-cobranca/shared/case-schemas";
import { getExecutionDetail, listExecutions } from "../../../src/api-client";
import { AdminShell } from "../../../src/components/AdminShell";
import { JsonViewer } from "../../../src/components/JsonViewer";

export default function ExecutionsPage() {
  return (
    <AdminShell>
      {(token) => <Executions token={token} />}
    </AdminShell>
  );
}

function Executions({ token }: { token: string }) {
  const [executions, setExecutions] = useState<HistoryListItem[]>([]);
  const [detail, setDetail] = useState<ExecutionDetail | null>(null);
  const [status, setStatus] = useState("");

  async function load() {
    setStatus("Atualizando");
    try {
      const data = await listExecutions(token);
      setExecutions(data);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro");
    }
  }

  async function select(id: string) {
    setStatus("Carregando");
    try {
      setDetail(await getExecutionDetail(token, id));
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
        <h1>Execucoes</h1>
        <button type="button" onClick={load}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>
      <p className="status-line">{status}</p>
      <div className="split-band">
        <div className="table-band">
          <table>
            <thead>
              <tr>
                <th>Fluxo</th>
                <th>Status</th>
                <th>Modelo</th>
                <th>Custo</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((execution) => (
                <tr key={execution.id} onClick={() => select(execution.id)}>
                  <td>{execution.type}</td>
                  <td>{execution.status}</td>
                  <td>{execution.model_used ?? "nao informado"}</td>
                  <td>{execution.cost_usd == null ? "nao informado" : `$${execution.cost_usd}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="detail-panel">
          <div className="section-title">
            <h2>Detalhe</h2>
          </div>
          {detail ? (
            <>
              <div className="two-cols">
                <span className="badge">{detail.type}</span>
                <span className="badge">{detail.status}</span>
              </div>
              <JsonViewer value={detail} />
            </>
          ) : (
            <p className="status-line">Selecione uma execucao</p>
          )}
        </div>
      </div>
    </>
  );
}
