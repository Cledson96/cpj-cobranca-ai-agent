"use client";

import { Check, Plus, RefreshCw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { PromptTemplateCreate, PromptTemplateListItem } from "@cpj-cobranca/shared/admin-schemas";
import type { FlowType } from "@cpj-cobranca/shared/flow-types";
import {
  activatePromptTemplate,
  createPromptTemplate,
  listPromptTemplates,
} from "../../../src/api-client";
import { AdminShell } from "../../../src/components/AdminShell";

const flows = ["review", "compliance", "document", "tests"] as const satisfies readonly FlowType[];

export default function PromptsPage() {
  return (
    <AdminShell>
      {(token) => <Prompts token={token} />}
    </AdminShell>
  );
}

function Prompts({ token }: { token: string }) {
  const [templates, setTemplates] = useState<PromptTemplateListItem[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<FlowType>("review");
  const [draft, setDraft] = useState<PromptTemplateCreate>(emptyDraft("review"));
  const [status, setStatus] = useState("");
  const visibleTemplates = useMemo(
    () => templates.filter((template) => template.flowType === selectedFlow),
    [templates, selectedFlow],
  );

  async function load() {
    setStatus("Atualizando");
    try {
      const data = await listPromptTemplates(token);
      setTemplates(data);
      const active = data.find((template) => template.flowType === selectedFlow && template.isActive);
      setDraft(active ? toDraft(active) : emptyDraft(selectedFlow));
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro");
    }
  }

  async function save() {
    setStatus("Salvando");
    try {
      await createPromptTemplate(token, draft);
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro");
    }
  }

  async function activate(id: string) {
    setStatus("Ativando");
    try {
      await activatePromptTemplate(token, id);
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro");
    }
  }

  useEffect(() => {
    void load();
  }, [token, selectedFlow]);

  return (
    <>
      <div className="page-header">
        <h1>Prompts</h1>
        <button type="button" onClick={load}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>
      <div className="tabs">
        {flows.map((flow) => (
          <button
            key={flow}
            type="button"
            className={flow === selectedFlow ? "active" : ""}
            onClick={() => {
              setSelectedFlow(flow);
              setDraft(emptyDraft(flow));
            }}
          >
            {flow}
          </button>
        ))}
      </div>
      <div className="split-band">
        <div>
          <div className="section-title">
            <h2>Versoes</h2>
          </div>
          <table>
            <tbody>
              {visibleTemplates.map((template) => (
                <tr key={template.id}>
                  <td>
                    <strong>v{template.version}</strong> {template.name}
                    {template.isActive ? <span className="badge green">ativo</span> : null}
                  </td>
                  <td>
                    <button
                      type="button"
                      disabled={template.isActive}
                      onClick={() => activate(template.id)}
                    >
                      <Check size={15} />
                      Ativar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="form-grid">
          <label>
            Nome
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label>
            System template
            <textarea
              value={draft.systemTemplate}
              onChange={(event) => setDraft({ ...draft, systemTemplate: event.target.value })}
            />
          </label>
          <label>
            User template
            <textarea
              value={draft.userTemplate}
              onChange={(event) => setDraft({ ...draft, userTemplate: event.target.value })}
            />
          </label>
          <label>
            Notas
            <input
              value={draft.notes ?? ""}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            />
          </label>
          <div className="toolbar">
            <button type="button" onClick={() => setDraft(emptyDraft(selectedFlow))}>
              <Plus size={16} />
              Nova
            </button>
            <button className="primary" type="button" onClick={save}>
              <Save size={16} />
              Criar versao
            </button>
          </div>
          <p className="status-line">{status}</p>
        </div>
      </div>
    </>
  );
}

function emptyDraft(flowType: FlowType): PromptTemplateCreate {
  return {
    flowType,
    name: `${flowType} vNext`,
    systemTemplate: "",
    userTemplate: "",
    responseSchemaName: flowType,
    notes: "",
  };
}

function toDraft(template: PromptTemplateListItem): PromptTemplateCreate {
  return {
    flowType: template.flowType,
    name: `${template.name} copia`,
    systemTemplate: template.systemTemplate,
    userTemplate: template.userTemplate,
    responseSchemaName: template.responseSchemaName,
    notes: template.notes ?? "",
  };
}
