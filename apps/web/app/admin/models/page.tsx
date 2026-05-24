"use client";

import { RefreshCw, Save, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  FlowModelSetting,
  FlowModelSettingUpdate,
  OpenRouterModel,
} from "@cpj-cobranca/shared/admin-schemas";
import type { FlowType } from "@cpj-cobranca/shared/flow-types";
import {
  listFlowSettings,
  listModels,
  syncModels,
  updateFlowSetting,
} from "../../../src/api-client";
import { AdminShell } from "../../../src/components/AdminShell";

export default function ModelsPage() {
  return (
    <AdminShell>
      {(token) => <Models token={token} />}
    </AdminShell>
  );
}

function Models({ token }: { token: string }) {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [settings, setSettings] = useState<FlowModelSetting[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const filteredModels = useMemo(() => {
    const normalized = query.toLowerCase();
    return models.filter(
      (model) =>
        model.id.toLowerCase().includes(normalized) ||
        model.name.toLowerCase().includes(normalized),
    );
  }, [models, query]);

  async function load() {
    setStatus("Atualizando");
    try {
      const [modelData, settingData] = await Promise.all([
        listModels(token),
        listFlowSettings(token),
      ]);
      setModels(modelData);
      setSettings(settingData);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro");
    }
  }

  async function sync() {
    setStatus("Sincronizando");
    try {
      const result = await syncModels(token);
      await load();
      setStatus(`${result.synced} modelos sincronizados`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro");
    }
  }

  async function save(flowType: FlowType, payload: FlowModelSettingUpdate) {
    setStatus("Salvando");
    try {
      await updateFlowSetting(token, flowType, payload);
      await load();
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
        <h1>Modelos</h1>
        <div className="toolbar">
          <button type="button" onClick={load}>
            <RefreshCw size={16} />
            Atualizar
          </button>
          <button className="primary" type="button" onClick={sync}>
            <SlidersHorizontal size={16} />
            Sync
          </button>
        </div>
      </div>
      <p className="status-line">{status}</p>
      <div className="split-band">
        <div>
          <div className="section-title">
            <h2>Settings</h2>
          </div>
          <div className="form-grid">
            {settings.map((setting) => (
              <FlowSettingForm key={setting.flowType} setting={setting} onSave={save} />
            ))}
          </div>
        </div>
        <div>
          <label>
            Buscar modelo
            <div className="inline-form">
              <input value={query} onChange={(event) => setQuery(event.target.value)} />
              <button type="button" title="Buscar">
                <Search size={16} />
              </button>
            </div>
          </label>
          <div className="table-band">
            <table>
              <thead>
                <tr>
                  <th>Modelo</th>
                  <th>Contexto</th>
                  <th>Input</th>
                  <th>Output</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.slice(0, 80).map((model) => (
                  <tr key={model.id}>
                    <td>
                      <strong>{model.name}</strong>
                      <br />
                      <span className="status-line">{model.id}</span>
                    </td>
                    <td>{model.contextLength ?? "nao informado"}</td>
                    <td>{formatPrice(model.promptPrice)}</td>
                    <td>{formatPrice(model.completionPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function FlowSettingForm({
  setting,
  onSave,
}: {
  setting: FlowModelSetting;
  onSave: (flowType: FlowType, payload: FlowModelSettingUpdate) => Promise<void>;
}) {
  const [draft, setDraft] = useState<FlowModelSettingUpdate>({
    primaryModel: setting.primaryModel,
    fallbackModels: setting.fallbackModels,
    temperature: setting.temperature,
    maxTokens: setting.maxTokens,
    responseFormatMode: setting.responseFormatMode,
  });

  return (
    <div className="form-band">
      <div className="section-title">
        <h2>{setting.flowType}</h2>
        <button type="button" onClick={() => onSave(setting.flowType, draft)}>
          <Save size={16} />
          Salvar
        </button>
      </div>
      <div className="form-grid">
        <label>
          Modelo primario
          <input
            value={draft.primaryModel}
            onChange={(event) => setDraft({ ...draft, primaryModel: event.target.value })}
          />
        </label>
        <label>
          Fallbacks
          <input
            value={draft.fallbackModels.join(", ")}
            onChange={(event) =>
              setDraft({
                ...draft,
                fallbackModels: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <div className="two-cols">
          <label>
            Temperatura
            <input
              type="number"
              step="0.1"
              value={draft.temperature}
              onChange={(event) =>
                setDraft({ ...draft, temperature: Number(event.target.value) })
              }
            />
          </label>
          <label>
            Max tokens
            <input
              type="number"
              value={draft.maxTokens}
              onChange={(event) => setDraft({ ...draft, maxTokens: Number(event.target.value) })}
            />
          </label>
        </div>
        <label>
          Formato
          <select
            value={draft.responseFormatMode}
            onChange={(event) =>
              setDraft({
                ...draft,
                responseFormatMode: event.target.value as FlowModelSettingUpdate["responseFormatMode"],
              })
            }
          >
            <option value="json_schema">json_schema</option>
            <option value="json_object">json_object</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function formatPrice(value: number | null): string {
  return value == null ? "nao informado" : `$${value}`;
}
