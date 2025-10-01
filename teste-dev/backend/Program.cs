
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// CORS para ambiente local (frontend: http://localhost:3000)
var allowedOrigins = new[] { "http://localhost:3000", "http://127.0.0.1:3000" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", p =>
        p.WithOrigins(allowedOrigins)
         .AllowAnyHeader()
         .AllowAnyMethod());
});

// Postgres connection
var connString = builder.Configuration.GetConnectionString("Postgres")
    ?? "Host=localhost;Port=5432;Database=postgres;Username=adm;Password=1234";

builder.Services.AddDbContext<AppDb>(opt => opt.UseNpgsql(connString));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("DevCors");

app.MapGet("/", () => Results.Redirect("/swagger"));

//ENDPOINTS CLIENTES
app.MapGet("/api/clients", async (AppDb db) =>
{
    var clients = await db.Clients.Include(c => c.Vehicles).ToListAsync();
    return Results.Ok(clients);
});

app.MapGet("/api/clients/{id:int}", async (int id, AppDb db) =>
{
    var client = await db.Clients.Include(c => c.Vehicles).FirstOrDefaultAsync(c => c.Id == id);
    return client is null ? Results.NotFound() : Results.Ok(client);
});

app.MapPost("/api/clients", async (ClientCreateDto dto, AppDb db) =>
{
    var client = new Client { Name = dto.Name, Phone = dto.Phone };
    db.Clients.Add(client);
    await db.SaveChangesAsync();

    if (dto.ExistingVehicleIds is not null && dto.ExistingVehicleIds.Count > 0)
    {
        var vehicles = await db.Vehicles.Where(v => dto.ExistingVehicleIds.Contains(v.Id)).ToListAsync();
        foreach (var v in vehicles) v.ClientId = client.Id;
    }

    if (dto.NewVehicles is not null)
    {
        foreach (var v in dto.NewVehicles)
        {
            db.Vehicles.Add(new Vehicle
            {
                Brand = v.Brand,
                Model = v.Model,
                Plate = v.Plate,
                ClientId = client.Id
            });
        }
    }

    await db.SaveChangesAsync();

    var created = await db.Clients.Include(c => c.Vehicles).FirstAsync(c => c.Id == client.Id);
    return Results.Created($"/api/clients/{client.Id}", created);
});

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

app.MapDelete("/api/clients/{id:int}", async (int id, AppDb db) =>
{
    var client = await db.Clients.FindAsync(id);
    if (client is null) return Results.NotFound();

    
    var vehicles = await db.Vehicles.Where(v => v.ClientId == id).ToListAsync();
    foreach (var v in vehicles) v.ClientId = null;

    db.Vehicles.RemoveRange(vehicles);
    db.Clients.Remove(client);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapPost("/api/clients/{id:int}/associate-vehicles", async (int id, AssociateVehiclesDto dto, AppDb db) =>
{
    var client = await db.Clients.FindAsync(id);
    if (client is null) return Results.NotFound();

    var vehicles = await db.Vehicles.Where(v => dto.VehicleIds.Contains(v.Id)).ToListAsync();
    foreach (var v in vehicles) v.ClientId = id;

    await db.SaveChangesAsync();
    return Results.Ok();
});

// ENDPOINTS VEÍCULOS
app.MapGet("/api/vehicles", async (AppDb db) =>
{
    var vehicles = await db.Vehicles.Include(v => v.Client).ToListAsync();
    return Results.Ok(vehicles);
});

app.MapGet("/api/vehicles/{id:int}", async (int id, AppDb db) =>
{
    var vehicle = await db.Vehicles.Include(v => v.Client).FirstOrDefaultAsync(v => v.Id == id);
    return vehicle is null ? Results.NotFound() : Results.Ok(vehicle);
});

app.MapPost("/api/vehicles", async (VehicleCreateDto dto, AppDb db) =>
{
    var vehicle = new Vehicle
    {
        Brand = dto.Brand,
        Model = dto.Model,
        Plate = dto.Plate,
        ClientId = dto.ClientId
    };
    db.Vehicles.Add(vehicle);
    await db.SaveChangesAsync();
    return Results.Created($"/api/vehicles/{vehicle.Id}", vehicle);
});

app.MapPut("/api/vehicles/{id:int}", async (int id, VehicleUpdateDto dto, AppDb db) =>
{
    var vehicle = await db.Vehicles.FindAsync(id);
    if (vehicle is null) return Results.NotFound();

    vehicle.Brand = dto.Brand;
    vehicle.Model = dto.Model;
    vehicle.Plate = dto.Plate;
    vehicle.ClientId = dto.ClientId; 

    await db.SaveChangesAsync();
    return Results.Ok(vehicle);
});

app.MapDelete("/api/vehicles/{id:int}", async (int id, AppDb db) =>
{
    var vehicle = await db.Vehicles.FindAsync(id);
    if (vehicle is null) return Results.NotFound();

     db.Vehicles.Remove(vehicle);
     await db.SaveChangesAsync();
     return Results.NoContent();
});

app.Run();


// ---------------- Models, DTOs & DbContext ----------------
public class Client
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Phone { get; set; }
    public List<Vehicle> Vehicles { get; set; } = new();
}

public class Vehicle
{
    public int Id { get; set; }
    public string Brand { get; set; } = "";
    public string Model { get; set; } = "";
    public string Plate { get; set; } = "";
    public int? ClientId { get; set; }
    public Client? Client { get; set; }
}

public class ClientCreateDto
{
    public string Name { get; set; } = "";
    public string? Phone { get; set; }
    public List<int>? ExistingVehicleIds { get; set; }
    public List<VehicleSimpleDto>? NewVehicles { get; set; }
}

public class ClientUpdateDto
{
    public string Name { get; set; } = "";
    public string? Phone { get; set; }
    public List<int>? ExistingVehicleIds { get; set; }
}

public class VehicleCreateDto
{
    public string Brand { get; set; } = "";
    public string Model { get; set; } = "";
    public string Plate { get; set; } = "";
    public int? ClientId { get; set; }
}

public class VehicleUpdateDto : VehicleCreateDto { }

public class VehicleSimpleDto
{
    public string Brand { get; set; } = "";
    public string Model { get; set; } = "";
    public string Plate { get; set; } = "";
}

public class AssociateVehiclesDto
{
    public List<int> VehicleIds { get; set; } = new();
}

public class AppDb : DbContext
{
    public AppDb(DbContextOptions<AppDb> options) : base(options) { }

    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Client>(e =>
        {
            e.Property(p => p.Name).IsRequired().HasMaxLength(120);
            e.Property(p => p.Phone).HasMaxLength(30);
        });

        modelBuilder.Entity<Vehicle>(e =>
        {
            e.Property(p => p.Brand).IsRequired().HasMaxLength(60);
            e.Property(p => p.Model).IsRequired().HasMaxLength(60);
            e.Property(p => p.Plate).IsRequired().HasMaxLength(20);
            e.HasIndex(p => p.Plate).IsUnique();
            e.HasOne(v => v.Client)
                .WithMany(c => c.Vehicles)
                .HasForeignKey(v => v.ClientId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
