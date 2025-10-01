import React, { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000";

function Banner({ type = "info", children }) {
  const style = {
    info: { background: "#0b1220", border: "1px solid #334155", color: "#e2e8f0" },
    warn: { background: "#3b1d0f", border: "1px solid #9a3412", color: "#fde68a" },
    error: { background: "#3b0f12", border: "1px solid #7f1d1d", color: "#fecaca" },
  }[type];
  return <div style={{ ...style, padding: 10, borderRadius: 8, marginBottom: 12 }}>{children}</div>;
}

function ClientsCard() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [existingVehicleIds, setExistingVehicleIds] = useState([]);
  const [newVehicle, setNewVehicle] = useState({ brand: "", model: "", plate: "" });
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [cRes, vRes] = await Promise.all([
        fetch(`${API}/api/clients`),
        fetch(`${API}/api/vehicles`),
      ]);
      if (!cRes.ok || !vRes.ok)
        throw new Error(`API offline ou erro (${cRes.status}/${vRes.status})`);
      const [c, v] = await Promise.all([cRes.json(), vRes.json()]);
      setClients(Array.isArray(c) ? c : []);
      setVehicles(Array.isArray(v) ? v : []);
    } catch (e) {
      setError(e.message || "Falha ao carregar dados");
      setClients([]);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const createClient = async () => {
    try {
      const payload = {
        name,
        phone,
        existingVehicleIds: existingVehicleIds.map((x) => parseInt(x, 10)).filter(Boolean),
        newVehicles: newVehicle.brand || newVehicle.model || newVehicle.plate ? [newVehicle] : [],
      };
      const res = await fetch(`${API}/api/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      setName("");
      setPhone("");
      setExistingVehicleIds([]);
      setNewVehicle({ brand: "", model: "", plate: "" });

      window.location.reload();

      await load();

    } catch (e) {
      alert("Erro ao salvar cliente: " + (e.message || e));
    }
  };

  const updateClient = async (id) => {
    try {
      const payload = {
        name,
        phone,
        existingVehicleIds: existingVehicleIds.map((x) => parseInt(x, 10)).filter(Boolean),
      };
      console.log(payload);
      const res = await fetch(`${API}/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      cancelEdit();
      await load();
    } catch (e) {
      alert("Erro ao atualizar: " + (e.message || e));
    }
  };

  const deleteClient = async (client) => {
    if(client.vehicles && client.vehicles.length > 0) {
      if(!confirm(`O cliente ${client.name} possui veículos associados. Tem certeza que deseja deletá-lo?`)) {
        return;
      }
    }
    else{
    if (!confirm(`Deletar cliente ${client.name}?`)) return;
    }

    await fetch(`${API}/api/clients/${client.id}`, { method: "DELETE" });
    await load();
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setName(c.name);
    setPhone(c.phone ?? "");
    setExistingVehicleIds((c.vehicles ?? []).map((v) => String(v.id)));
    setNewVehicle({ brand: "", model: "", plate: "" });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setPhone("");
    setExistingVehicleIds([]);
    setNewVehicle({ brand: "", model: "", plate: "" });
  };

  return (
    <div className="card">
      <h2>Clientes</h2>

      {error && (
        <Banner type="error">
          Não consegui falar com a API ({error}). Verifique se o backend está em{" "}
          <code>http://localhost:5000</code> e com CORS ativo.
        </Banner>
      )}
      {loading && <Banner type="info">Carregando...</Banner>}

      <div className="row">
        <div>
          <label>Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: João da Silva"
          />
        </div>
        <div>
          <label>Telefone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
          />
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <label>Associar veículos existentes</label>
        <select
          multiple
          value={existingVehicleIds}
          onChange={(e) =>
            setExistingVehicleIds(Array.from(e.target.selectedOptions).map((o) => o.value))
          }
          style={{ width: "100%", minHeight: 90 }}
        >
          {vehicles.map((v) => (
            <option key={v.id} value={String(v.id)}>
              {v.plate} — {v.brand} {v.model} {v.client ? `(de ${v.client.name})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginTop: 8 }}>
        <label>Ou criar um veículo novo para este cliente</label>
        <div className="row3">
          <input
            placeholder="Marca"
            value={newVehicle.brand}
            onChange={(e) => setNewVehicle((s) => ({ ...s, brand: e.target.value }))}
          />
          <input
            placeholder="Modelo"
            value={newVehicle.model}
            onChange={(e) => setNewVehicle((s) => ({ ...s, model: e.target.value }))}
          />
          <input
            placeholder="Placa"
            value={newVehicle.plate}
            onChange={(e) => setNewVehicle((s) => ({ ...s, plate: e.target.value }))}
          />
        </div>
      </div>
      <div className="actions">
        {editingId ? (
          <>
            <button className="btn primary" onClick={() => updateClient(editingId)}>
              Salvar
            </button>
            <button className="btn" onClick={cancelEdit}>
              Cancelar
            </button>
          </>
        ) : (
          <button className="btn primary" onClick={createClient}>
            Cadastrar
          </button>
        )}
      </div>

      <hr />
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Veículos</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.name}</td>
              <td>{c.phone ?? "-"}</td>
              <td>
                {(c.vehicles ?? []).map((v) => (
                  <span key={v.id} className="badge" style={{ marginRight: 6 }}>
                    {v.plate}
                  </span>
                ))}
              </td>
              <td>
                <div className="actions">
                  <button className="btn" onClick={() => startEdit(c)}>
                    Editar
                  </button>
                  <button className="btn danger" onClick={() => deleteClient(c)}>
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {(!clients || clients.length === 0) && !loading && (
            <tr>
              <td colSpan="5" style={{ opacity: 0.75 }}>
                Nenhum cliente cadastrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function VehiclesCard() {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [clientId, setClientId] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [vRes, cRes] = await Promise.all([
        fetch(`${API}/api/vehicles`),
        fetch(`${API}/api/clients`),
      ]);
      if (!vRes.ok || !cRes.ok)
        throw new Error(`API offline ou erro (${vRes.status}/${cRes.status})`);
      const [v, c] = await Promise.all([vRes.json(), cRes.json()]);
      setVehicles(Array.isArray(v) ? v : []);
      setClients(Array.isArray(c) ? c : []);
    } catch (e) {
      setError(e.message || "Falha ao carregar dados");
      setVehicles([]);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const createVehicle = async () => {
    try {
      const payload = { brand, model, plate, clientId: clientId ? parseInt(clientId, 10) : null };
      const res = await fetch(`${API}/api/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setBrand("");
      setModel("");
      setPlate("");
      setClientId("");
      await load();
    } catch (e) {
      alert("Erro ao salvar veículo: " + (e.message || e));
    }
  };

  const updateVehicle = async (id) => {
    try {
      const payload = { brand, model, plate, clientId: clientId ? parseInt(clientId, 10) : null };
      console.log(payload);

      const vehicle = vehicles.find(v => v.id === id);

      if(vehicle.clientId != null){
        if(!confirm("Este veículo não está associado a um cliente. Tem certeza que deseja continuar?")) {
          return;
        }
      }

      const res = await fetch(`${API}/api/vehicles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      cancelEdit();
      await load();
    } catch (e) {
      alert("Erro ao atualizar: " + (e.message || e));
    }
  };

  const deleteVehicle = async (vechile) => {
    if (vechile.clientId != null) {
      if (!confirm(`Excluir veículo ${vechile.plate} do cliente ${vechile.client.name}?`)) return;
    }
    else if (!confirm(`Excluir veículo ${vechile.plate}? --Nenhum cliente vinculado--`)) return;
    await fetch(`${API}/api/vehicles/${vechile.id}`, { method: "DELETE" });
    await load();
  };

  const startEdit = (v) => {
    setEditingId(v.id);
    setBrand(v.brand);
    setModel(v.model);
    setPlate(v.plate);
    setClientId(v.clientId ? String(v.clientId) : "");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setBrand("");
    setModel("");
    setPlate("");
    setClientId("");
  };

  return (
    <div className="card">
      <h2>Veículos</h2>

      {error && (
        <Banner type="error">
          Não consegui falar com a API ({error}). Verifique se o backend está em{" "}
          <code>http://localhost:5000</code>.
        </Banner>
      )}
      {loading && <Banner type="info">Carregando...</Banner>}

      <div className="row3">
        <input placeholder="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} />
        <input placeholder="Modelo" value={model} onChange={(e) => setModel(e.target.value)} />
        <input placeholder="Placa" value={plate} onChange={(e) => setPlate(e.target.value)} />
      </div>
      <div style={{ marginTop: 8 }}>
        <label>Associar a um cliente (opcional)</label>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          style={{ width: "100%" }}
        >
          <option value="">-- sem cliente --</option>
          {clients.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="actions">
        {editingId ? (
          <>
            <button className="btn primary" onClick={() => updateVehicle(editingId)}>
              Salvar
            </button>
            <button className="btn" onClick={cancelEdit}>
              Cancelar
            </button>
          </>
        ) : (
          <button className="btn primary" onClick={createVehicle}>
            Cadastrar
          </button>
        )}
      </div>

      <hr />
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Placa</th>
            <th>Marca</th>
            <th>Modelo</th>
            <th>Cliente</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id}>
              <td>{v.id}</td>
              <td>
                <span className="badge">{v.plate}</span>
              </td>
              <td>{v.brand}</td>
              <td>{v.model}</td>
              <td>{v.client ? v.client.name : "-"}</td>
              <td>
                <div className="actions">
                  <button className="btn" onClick={() => startEdit(v)}>
                    Editar
                  </button>
                  <button className="btn danger" onClick={() => deleteVehicle(v)}>
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {(!vehicles || vehicles.length === 0) && !loading && (
            <tr>
              <td colSpan="6" style={{ opacity: 0.75 }}>
                Nenhum veículo cadastrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  return (
    <div className="container">
      <h1>Estacionamento</h1>
      <div className="grid">
        <ClientsCard />
        <VehiclesCard />
      </div>
    </div>
  );
}
