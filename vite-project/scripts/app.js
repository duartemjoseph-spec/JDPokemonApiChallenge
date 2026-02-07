// ---------- DOM ----------
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const randomBtn = document.getElementById("randomBtn");
const statusText = document.getElementById("statusText");

const pokeName = document.getElementById("pokeName");
const pokeId = document.getElementById("pokeId");
const imgNormal = document.getElementById("imgNormal");
const imgShiny = document.getElementById("imgShiny");
const pokeTypes = document.getElementById("pokeTypes");
const pokeLocation = document.getElementById("pokeLocation");

const abilitiesList = document.getElementById("abilitiesList");
const movesList = document.getElementById("movesList");
const evoPathsDiv = document.getElementById("evoPaths");

const favBtn = document.getElementById("favBtn");
const favoritesList = document.getElementById("favoritesList");

const BASE = "https://pokeapi.co/api/v2";
const FAVORITES_KEY = "pokemon_favorites";
let currentPokemon = null;

function setStatus(msg) {
  statusText.textContent = msg;
}

function titleCase(text) {
  return text
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function isGen1to5(id) {
  return Number.isInteger(id) && id >= 1 && id <= 649;
}

function getFavorites() {
  const raw = localStorage.getItem(FAVORITES_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveFavorites(list) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
}

function isFavorite(id) {
  return getFavorites().some(p => p.id === id);
}

function renderFavorites() {
  const favs = getFavorites();
  favoritesList.innerHTML = "";

  if (favs.length === 0) {
    favoritesList.innerHTML = `<li class="text-slate-700 text-sm">No favorites yet.</li>`;
    return;
  }

  favs.forEach(f => {
    const li = document.createElement("li");
    li.className = "flex justify-between items-center gap-2 bg-white/90 border-2 border-slate-300 rounded-xl px-3 py-2";

    li.innerHTML = `
      <span class="text-slate-800 text-sm">#${f.id} ${f.name}</span>
      <button data-id="${f.id}" class="bg-slate-900 text-white px-3 py-1 rounded-lg">Load</button>
    `;

    favoritesList.appendChild(li);
  });
}

// ---------- API CALLS ----------
async function getPokemon(nameOrId) {
  const res = await fetch(`${BASE}/pokemon/${nameOrId}`);
  if (!res.ok) throw new Error("Pokemon not found.");
  return await res.json();
}

async function getLocation(pokemonId) {
  const res = await fetch(`${BASE}/pokemon/${pokemonId}/encounters`);
  if (!res.ok) return "N/A";

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return "N/A";

  const loc = data[0]?.location_area?.name;
  return loc ? titleCase(loc) : "N/A";
}

function buildPaths(node, current, paths) {
  const name = node?.species?.name;
  if (!name) return;

  const next = [...current, name];
  const evolvesTo = node.evolves_to || [];

  if (evolvesTo.length === 0) {
    paths.push(next);
    return;
  }

  evolvesTo.forEach(child => buildPaths(child, next, paths));
}

async function getEvolutionPaths(pokemonData) {
  const speciesRes = await fetch(pokemonData.species.url);
  if (!speciesRes.ok) return [["N/A"]];
  const species = await speciesRes.json();

  const evoUrl = species.evolution_chain?.url;
  if (!evoUrl) return [["N/A"]];

  const evoRes = await fetch(evoUrl);
  if (!evoRes.ok) return [["N/A"]];
  const evo = await evoRes.json();

  if (!evo.chain) return [["N/A"]];

  const paths = [];
  buildPaths(evo.chain, [], paths);

  if (paths.length === 0) return [["N/A"]];
  return paths;
}

async function getSpriteByName(pokemonName) {
  try {
    const res = await fetch(`${BASE}/pokemon/${pokemonName}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.sprites?.front_default || null;
  } catch {
    return null;
  }
}

function setOutlinedHeading(el, text) {
  el.classList.add("relative");
  el.innerHTML = `
    <span class="absolute inset-0 select-none text-emerald-600"
        
    >${text}</span>

    <span class="relative text-emerald-600"
    >${text}</span>
  `;
}


async function renderEvolutionPaths(evolutionPaths) {
  evoPathsDiv.innerHTML = "";

  if (!Array.isArray(evolutionPaths) || evolutionPaths.length === 0 || evolutionPaths[0][0] === "N/A") {
    const pEl = document.createElement("p");
    pEl.textContent = "N/A";
    evoPathsDiv.appendChild(pEl);
    return;
  }

  for (const pathArr of evolutionPaths) {
    const row = document.createElement("div");
    row.className = "flex flex-wrap items-center gap-2";

    for (let i = 0; i < pathArr.length; i++) {
      const name = pathArr[i];

      const chip = document.createElement("div");
      chip.className = "flex items-center gap-2 bg-white/90 border-2 border-slate-300 rounded-2xl px-3 py-2";

      const spriteUrl = await getSpriteByName(name);
      if (spriteUrl) {
        const img = document.createElement("img");
        img.className = "w-20 h-20 sm:w-24 sm:h-24 object-contain";
        img.alt = titleCase(name);
        img.src = spriteUrl;
        chip.appendChild(img);
      }

      const label = document.createElement("span");
      label.className = "text-base";
      label.textContent = titleCase(name);
      chip.appendChild(label);

      row.appendChild(chip);

      if (i < pathArr.length - 1) {
        const arrow = document.createElement("span");
        arrow.className = "text-slate-800 font-bold";
        arrow.textContent = "→";
        row.appendChild(arrow);
      }
    }

    evoPathsDiv.appendChild(row);
  }
}

function renderPokemon(p, location) {
  pokeName.classList.add("relative");
  pokeName.style.fontFamily = "'Luckiest Guy', system-ui";
  setOutlinedHeading(pokeName, titleCase(p.name));

  pokeId.textContent = p.id;

  imgNormal.src = p.sprites?.front_default || "";
  imgShiny.src = p.sprites?.front_shiny || "";

  pokeTypes.textContent = p.types.map(t => titleCase(t.type.name)).join(", ");
  pokeLocation.textContent = location;

  abilitiesList.innerHTML = "";
  p.abilities.forEach(a => {
    const li = document.createElement("li");
    li.textContent = titleCase(a.ability.name);
    abilitiesList.appendChild(li);
  });

  movesList.innerHTML = "";
  p.moves.forEach(m => {
    const li = document.createElement("li");
    li.textContent = titleCase(m.move.name);
    movesList.appendChild(li);
  });

  favBtn.textContent = isFavorite(p.id) ? "Remove Favorite" : "Add to Favorites";
}

// ---------- MAIN LOAD ----------
async function loadPokemon(nameOrId) {
  try {
    setStatus("Loading...");
    const p = await getPokemon(nameOrId);

    if (!isGen1to5(p.id)) {
      setStatus("Only Gen 1–5 allowed (1–649).");
      return;
    }

    const location = await getLocation(p.id);
    const evoPaths = await getEvolutionPaths(p);

    currentPokemon = p;
    renderPokemon(p, location);
    await renderEvolutionPaths(evoPaths);

    setStatus("Done.");
  } catch (err) {
    setStatus(err.message || "Something went wrong.");
  }
}

// ---------- EVENTS ----------
searchBtn.addEventListener("click", async () => {
  const input = searchInput.value.trim().toLowerCase();
  if (!input) return;

  const asNum = Number(input);
  if (!Number.isNaN(asNum) && Number.isInteger(asNum)) {
    if (!isGen1to5(asNum)) {
      setStatus("Only Gen 1–5 allowed (1–649).");
      return;
    }
    await loadPokemon(asNum);
    return;
  }

  await loadPokemon(input);
});

randomBtn.addEventListener("click", async () => {
  const id = Math.floor(Math.random() * 649) + 1;
  await loadPokemon(id);
});

favBtn.addEventListener("click", () => {
  if (!currentPokemon) return;

  const favs = getFavorites();
  const summary = { id: currentPokemon.id, name: titleCase(currentPokemon.name) };

  const exists = favs.some(f => f.id === summary.id);
  const updated = exists ? favs.filter(f => f.id !== summary.id) : [summary, ...favs];

  saveFavorites(updated);
  renderFavorites();

  favBtn.textContent = exists ? "Add to Favorites" : "Remove Favorite";
});

favoritesList.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (isGen1to5(id)) await loadPokemon(id);
});

// ---------- INIT ----------
renderFavorites();
setStatus("Ready. Search a Pokemon name or # (1–649).");
