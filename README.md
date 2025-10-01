# Projeto: Tarefas no site de veiculos

Descrição: Teste de capacidade proporcionado pela consiliadora (Back-end / Front-end)

# Jornada

No decoorrer da resolução das tarefas,ocorreu de ter tanto desafios back-end (minha especialização) quanto front-end (Possuo conhecimento mas bem menos,no que gerou desafios,porém o 
fluxo de dados não pareceu ser tão diferente de ambas as partes então deu pra resolver nos dois campos, e aprendendo na prática conforme ia resolvendo as questões.
Dei prioridade as questões mais simples primeiros e as mais complexas deixei por ultimo,conforme fui instruido no PDF.

**Resolução:** Precisei dar um ajeito em duas das sete questões que eu diria que não ficou "como deveria ser" exatamente,mas tentei ao maximo resolver a tarefa em questão.

# Resumo

## Tarefa 1

**Objetivo:** Centralizar os Cards na tela 

**Execução:** Mudei o esquema dos cards no CSS de grid para flex e utilizei o align-items:flex-start e justify-content:center
Motivo: Grid é mais usado quando se possui valores fixos bem definidos,ao tentar centralizar com grid,os inputs estavam ficando para fora do card,então utilizei
o flex que é mais flexivel quando não se tem largura ou altura bem definidos.

```
.grid {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 24px;
}
```



## Tarefa 2

**Objetivo:** Adaptar a tela para Displays Mobile

**Execução:** Utilizei o media query para,quando bater uma determinada largura minima,ele se ajustar em forma de coluna utilizando o flexbox-direction
Tambem defini uma largura maxima para os cards não ficarem gigante na tela,como no navegador.

```
@media (max-width: 768px) {
  .grid {
    flex-direction: column;
  }

  .card {
    width: 100%;    
    max-width: 500px;
  }
}
```

## Tarefa 3

**Objetivo:** Criar um alerta de exclusão antes de excluir o usuário.

**Execução:** No arquivo de fluxo de dados do front-end, percebi que para o alerta se usava o recurso "confirm" do doc do navegador.
Porem ela apenas passa um aviso,não passa a placa nem o nome do dono,e percebi que era passado apenas o id do veiculo,então simplesmente fiz a troca
de um id pelo veiculo inteiro,e consegui inserir informações tanto do veiculo quanto do dono no aviso.

```
  const deleteVehicle = async (vechile) => {
    if (vechile.clientId != null) {
      if (!confirm(`Excluir veículo ${vechile.plate} do cliente ${vechile.client.name}?`)) return;
    }
    else if (!confirm(`Excluir veículo ${vechile.plate}? --Nenhum cliente vinculado--`)) return;
    await fetch(`${API}/api/vehicles/${vechile.id}`, { method: "DELETE" });
    await load();
  };
```

## Tarefa 4

**Objetivo:** Corrigir o bug "O cliente não atualiza"

**Execução:** Analisando a entrada do payload no sistema e a inserção dos dados na API estavam corretas,então resolvi checar no back end,ali é visivel que o metodo atualiza
os carros vinculados ao cliente porem não atualiza o nome nem o telefone diretamente,o que explica a falta de mudança. Passei os atributos Nome e Phone da DTO a entidade
"cliente" que foi selecionada,e a atualização funcionou tranquilamente.

```
app.MapPut("/api/clients/{id:int}", async (int id, ClientUpdateDto dto, AppDb db) =>
{
    var client = await db.Clients.Include(c => c.Vehicles).FirstOrDefaultAsync(c => c.Id == id);
    if (client is null) return Results.NotFound();

    client.Name = dto.Name;
    client.Phone = dto.Phone;

    if (dto.ExistingVehicleIds is not null)
    {
        var currentVehicles = await db.Vehicles.Where(v => v.ClientId == client.Id).ToListAsync();
        foreach (var v in currentVehicles) v.ClientId = null;

        var toAssign = await db.Vehicles.Where(v => dto.ExistingVehicleIds.Contains(v.Id)).ToListAsync();
        foreach (var v in toAssign) v.ClientId = client.Id;
    }

    await db.SaveChangesAsync();
    var updated = await db.Clients.Include(c => c.Vehicles).FirstAsync(c => c.Id == id);
    return Results.Ok(updated);
});
```

## Tarefa 5

**Objetivo:** Interromper a associação de um veiculo já associado a um cliente + Desasociar o veiculo antecipadamente.

**Execução:** Fiz um algoritmo de confirmação onde é perguntado ao cliente se ele realmente deseja associar um veiculo a alguem,mesmo ja possuindo associação, Não consegui entender como seria o algoritmo exato 
que faria isso,então resolvi implementar esse meio termo.

```
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
```

## Tarefa 6

**Objetivo:** Ao adicionar um novo cliente, atualizar automaticamente tanto sua entidade,quanto os veiculos associados.

**Execução:** Tentei revisar em muitos lugares por que apenas o cliente estava sendo atualizado de forma dinamica,verifiquei o include de vechiles no back end,verifiquei todo o fluxo de
CreateClient() e Load(), porem sem nenhum sucesso. Infelizmente sem resultado fiz uso do window.location.reload(); que atualiza a pagina manualmente.

```
window.location.reload();
```

## Tarefa 7

**Objetivo:** Objetivo: Deletar cliente incluindo os veiculos + alerta com informações.

**Execução:**
- Extrai o cliente completo ao invés de apenas o id para conseguir adicionar informações do cliente e da existencia dos veiculos no alerta.
- No back end,dei um find dos veiculos associados ao cliente,e dei um delete nesses veiculos
- Procurei outros meios de deletar o veiculo impondo uma nova regra no OnModelCreating, porem devido a falta de ferramentas como o entity.tools para mecher na migration
do projeto,achei que quebraria alguma regra,mas achei uma operação recomendada.

```
modelBuilder.Entity<Vehicle>()
    .HasOne<Client>()
    .WithMany(c => c.Vehicles)
    .HasForeignKey(v => v.ClientId)
    .OnDelete(DeleteBehavior.Cascade);
```



