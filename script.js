const typeColors = {
    normal:'#A8A878',fire:'#F08030',water:'#6890F0',grass:'#78C850',
    electric:'#F8D030',ice:'#98D8D8',fighting:'#C03028',poison:'#A040A0',
    ground:'#E0C068',flying:'#A890F0',psychic:'#F85888',bug:'#A8B020',
    rock:'#B8A038',ghost:'#705898',dragon:'#7038F8',steel:'#B8B8D0'
};

// Version exclusives (Gen 1 Pokemon only from pokemondb.net)
// FireRed: Ekans,Arbok,Oddish,Gloom,Vileplume,Psyduck,Golduck,Growlithe,Arcanine,Shellder,Cloyster,Scyther,Electabuzz
const frExclusive = new Set([23,24,43,44,45,54,55,58,59,90,91,123,125]);
// LeafGreen: Sandshrew,Sandslash,Vulpix,Ninetales,Bellsprout,Weepinbell,Victreebel,Slowpoke,Slowbro,Staryu,Starmie,Magmar,Pinsir
const lgExclusive = new Set([27,28,37,38,69,70,71,79,80,120,121,126,127]);




const evoChainsByPokemon = {};
evoChains.forEach(chain => {
    chain.forEach(stage => {
        if(!evoChainsByPokemon[stage.id]) evoChainsByPokemon[stage.id] = [];
        evoChainsByPokemon[stage.id].push(chain);
    });
});

function triggerLabel(t) {
    if(!t) return '';
    if(t.type==='level') return 'Lv.'+t.lvl;
    if(t.type==='stone') return t.stone;
    if(t.type==='trade') return 'Trade';
    if(t.type==='friendship') return 'Friendship';
    return '';
}

function buildEvoChainHTML(pokemonId) {
    const chains = evoChainsByPokemon[pokemonId]||[];
    const seen=new Set();
    const unique=chains.filter(c=>{const k=c.map(s=>s.id).join('-');if(seen.has(k))return false;seen.add(k);return true;});
    return unique.map(chain=>{
        if(chain.length<=1) return '';
        let html='<div class="evo-chain">';
        chain.forEach((stage,i)=>{
            const isCur=stage.id===pokemonId;
            const pName=(pokemonData.find(p=>p.id===stage.id)||{name:'?'}).name;
            html+=`<div class="evo-node${isCur?' current-mon':''}">
                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${stage.id}.png" loading="lazy">
                <span class="evo-name">${pName}</span>
                <span class="evo-num">#${String(stage.id).padStart(3,'0')}</span>
            </div>`;
            if(i<chain.length-1&&chain[i].trigger){
                html+=`<div class="evo-arrow"><span>&#8594;</span><span class="evo-arrow-label">${triggerLabel(chain[i].trigger)}</span></div>`;
            }
        });
        return html+'</div>';
    }).join('');
}

function buildMovesHTML(pokemonId) {
    const moves = movesets[pokemonId];
    if(!moves||!moves.length) return '';
    // Sort by level asc (data is already sorted, but just in case)
    const sorted = [...moves].sort((a,b)=>a[0]-b[0]);
    const rows = sorted.map(([lvl,name])=>`<tr><td>${lvl}</td><td>${name}</td></tr>`).join('');
    return `<table class="moves-table">
        <caption>Level-up Moves</caption>
        <thead><tr><th>Lv</th><th>Move</th></tr></thead>
        <tbody>${rows}</tbody>
    </table>`;
}


const typeColors2 = typeColors; // alias

// Given a pokemon's type array, compute combined defensive effectiveness for each attacking type
// Returns {immune:[types], quarter:[types], half:[types], neutral:[types], double:[types], quad:[types]}
function getDefensiveChart(types) {
    const allTypes = Object.keys(TYPE_CHART);
    const result = {quad:[], double:[], half:[], quarter:[], immune:[]};
    allTypes.forEach(attacker => {
        let mult = 1;
        types.forEach(defType => {
            const row = TYPE_CHART[attacker];
            if(row && row[defType] !== undefined) mult *= row[defType];
        });
        if(mult === 0) result.immune.push(attacker);
        else if(mult <= 0.25) result.quarter.push(attacker);
        else if(mult <= 0.5) result.half.push(attacker);
        else if(mult >= 4) result.quad.push(attacker);
        else if(mult >= 2) result.double.push(attacker);
        // neutral: skip
    });
    return result;
}

// Given a pokemon's type array, compute offensive effectiveness (what this mon hits for 2x/0.5x/0x)
function getOffensiveChart(types) {
    const allTargetTypes = Object.keys(TYPE_CHART);
    // For each of this mon's types, compute what it hits
    const superEff = new Set(), notVery = new Set(), immune = new Set();
    types.forEach(atkType => {
        const row = TYPE_CHART[atkType];
        if(!row) return;
        allTargetTypes.forEach(def => {
            const m = row[def];
            if(m === 0) immune.add(def);
            else if(m >= 2) superEff.add(def);
            else if(m <= 0.5) notVery.add(def);
        });
    });
    return {superEff:[...superEff], notVery:[...notVery], immune:[...immune]};
}

function buildTypeChartHTML(p) {
    const def = getDefensiveChart(p.types);

    function pills(types, mult) {
        return types.map(t => `<span class="tc-pill" style="background:${typeColors[t]||'#888'}">${t}<span class="tc-mult">${mult}</span></span>`).join('');
    }

    let html = '<div class="typechart-wrap">';
    if(def.immune.length)  html += `<div class="typechart-label">Immune</div><div class="typechart-row">${pills(def.immune,'×0')}</div>`;
    if(def.quarter.length) html += `<div class="typechart-label">Resists ×¼</div><div class="typechart-row">${pills(def.quarter,'×¼')}</div>`;
    if(def.half.length)    html += `<div class="typechart-label">Resists ×½</div><div class="typechart-row">${pills(def.half,'×½')}</div>`;
    if(def.double.length)  html += `<div class="typechart-label">Weak ×2</div><div class="typechart-row">${pills(def.double,'×2')}</div>`;
    if(def.quad.length)    html += `<div class="typechart-label">Weak ×4</div><div class="typechart-row">${pills(def.quad,'×4')}</div>`;
    html += '</div>';
    return html;
}

// STATE
let activeSorts=[],activeFilters=[],filterLogic='OR';
let displayToggles={stats:true,evo:true,moves:true,typechart:true};
let teams=[],teamIdCounter=0,selectingSlot=null;

function toggleDisplay(section) {
    displayToggles[section]=!displayToggles[section];
    const active = displayToggles[section];
    document.getElementById('toggle-'+section).classList.toggle('active', active);
    document.querySelectorAll('.section-'+section).forEach(el=>el.classList.toggle('hidden',!active));
    // Mirror into drawer show row
    const dsb = document.querySelector('.drawer-show-btn[data-section="'+section+'"]');
    if(dsb) dsb.classList.toggle('dsb-active', active);
}

function initDrawerShowRow() {
    const row = document.getElementById('drawer-show-row');
    if(!row) return;
    const showDefs = [
        {section:'stats',     label:'&#128202; Stats'},
        {section:'typechart', label:'&#128737; Type Def'},
        {section:'evo',       label:'&#128260; Evo'},
        {section:'moves',     label:'&#129354; Moves'}
    ];
    showDefs.forEach(d => {
        const b = document.createElement('button');
        b.className = 'drawer-show-btn' + (displayToggles[d.section] ? ' dsb-active' : '');
        b.dataset.section = d.section;
        b.innerHTML = d.label;
        b.onclick = () => toggleDisplay(d.section);
        row.appendChild(b);
    });
}

function addTeamRow(){teams.push({id:++teamIdCounter,name:'Team '+teamIdCounter,slots:[null,null,null,null,null,null]});renderTeams();}
function removeTeam(id){teams=teams.filter(t=>t.id!==id);renderTeams();updateFABCount();updateListHighlights();}
function renameTeam(id,name){const t=teams.find(t=>t.id===id);if(t)t.name=name;}
function removeFromSlot(tid,si,e){if(e)e.stopPropagation();const t=teams.find(t=>t.id===tid);if(t){t.slots[si]=null;renderTeams();updateFABCount();updateListHighlights();}}
function addToSlot(tid,si,pid){const t=teams.find(t=>t.id===tid);if(t){t.slots[si]=pid;renderTeams();updateFABCount();updateListHighlights();}}
function startSelectingSlot(tid,si){selectingSlot={teamId:tid,slotIndex:si};document.getElementById('select-banner').classList.add('show');closeDrawer();}
function cancelSelectingSlot(){selectingSlot=null;document.getElementById('select-banner').classList.remove('show');}
function updateFABCount(){document.getElementById('team-count').textContent=teams.reduce((n,t)=>n+t.slots.filter(s=>s!==null).length,0);}
function countInTeams(pid){return teams.reduce((n,t)=>n+t.slots.filter(s=>s===pid).length,0);}
function updateListHighlights(){
    document.querySelectorAll('#main-list .card').forEach(card=>{
        const id=parseInt(card.dataset.id),count=countInTeams(id);
        card.classList.toggle('in-team',count>0);
        const b=card.querySelector('.team-count-badge');if(b)b.textContent=count;
    });
}

function renderTeams(){
    const container=document.getElementById('teams-list');
    container.innerHTML='';
    if(!teams.length){container.innerHTML='<p style="opacity:0.5;text-align:center;font-size:0.85rem;margin-top:30px">No teams yet.<br>Tap &quot;+ Add Team&quot; to get started.</p>';return;}
    teams.forEach(team=>{
        const div=document.createElement('div');div.className='team-container';
        let sh='';
        team.slots.forEach((pid,si)=>{
            if(pid!==null){
                const p=pokemonData.find(x=>x.id===pid);
                sh+=`<div class="slot slot-filled">
                    <button class="slot-remove-btn" onclick="removeFromSlot(${team.id},${si},event)">&#215;</button>
                    ${createCardHTML(p,false)}
                </div>`;
            } else {
                sh+=`<div class="slot empty-slot" onclick="startSelectingSlot(${team.id},${si})"></div>`;
            }
        });
        div.innerHTML=`<div class="team-label-row">
            <input class="team-name-input" value="${team.name}" oninput="renameTeam(${team.id},this.value)">
            <button class="delete-row-btn" onclick="removeTeam(${team.id})">&#128465;</button>
        </div><div class="team-slots">${sh}</div>`;
        container.appendChild(div);
    });
}

function openDrawer(){
    document.getElementById('team-drawer').classList.add('open');
    document.getElementById('drawer-overlay').classList.add('open');
    // On desktop (bottom sheet), push main content up so it's not hidden behind panel
    if(window.innerWidth > 1024) {
        const h = document.getElementById('team-drawer').offsetHeight;
        document.getElementById('main-list').style.paddingBottom = (h + 90) + 'px';
    }
}
function closeDrawer(){
    document.getElementById('team-drawer').classList.remove('open');
    document.getElementById('drawer-overlay').classList.remove('open');
    document.getElementById('main-list').style.paddingBottom = '';
}

function handleCardClick(el,pid){
    if(selectingSlot){addToSlot(selectingSlot.teamId,selectingSlot.slotIndex,pid);cancelSelectingSlot();openDrawer();return;}
    if(!teams.length)addTeamRow();
    for(const t of teams){const i=t.slots.indexOf(null);if(i!==-1){addToSlot(t.id,i,pid);return;}}
    openDrawer();
}

function toggleFilter(type,el){if(activeFilters.includes(type))activeFilters=activeFilters.filter(t=>t!==type);else activeFilters.push(type);el.classList.toggle('active');render();}
function resetFilters(){activeFilters=[];document.querySelectorAll('.type-pill').forEach(p=>p.classList.remove('active'));render();}
function toggleLogic(){filterLogic=filterLogic==='OR'?'AND':'OR';document.getElementById('logic-toggle').innerText=filterLogic;render();}
function handleSort(s){const i=activeSorts.findIndex(x=>x.stat===s);if(i===-1)activeSorts.push({stat:s,dir:'desc'});else if(activeSorts[i].dir==='desc')activeSorts[i].dir='asc';else activeSorts.splice(i,1);render();}
function resetSort(){activeSorts=[];render();}

function render(){
    let data=pokemonData.filter(p=>{if(!activeFilters.length)return true;return filterLogic==='OR'?activeFilters.some(t=>p.types.includes(t)):activeFilters.every(t=>p.types.includes(t));});
    data.sort((a,b)=>{for(let s of activeSorts){if(a[s.stat]!==b[s.stat])return s.dir==='desc'?b[s.stat]-a[s.stat]:a[s.stat]-b[s.stat];}return 0;});
    document.getElementById('main-list').innerHTML=data.map(p=>createCardHTML(p,true)).join('');
    updateSortUI();updateListHighlights();
}

function createCardHTML(p,clickable=true){
    const stats=['hp','atk','def','spa','spd','spe'];
    const maxVal=Math.max(...stats.map(s=>p[s]));
    const statsHTML=stats.map(s=>{
        const v=p[s],w=Math.min((v/160)*100,100),tier=v<60?'bar-low':v>90?'bar-high':'bar-mid';
        return `<div class="stat-row${v===maxVal?' max-stat':''}"><span class="stat-label">${s.toUpperCase()}</span><span style="width:22px">${v}</span><div class="stat-bar-bg"><div class="stat-bar-fill ${tier}" style="width:${w}%"></div></div></div>`;
    }).join('');
    const sH=displayToggles.stats?'':' hidden';
    const eH=displayToggles.evo?'':' hidden';
    const mH=displayToggles.moves?'':' hidden';
    const tcH=displayToggles.typechart?'':' hidden';
    const evoHTML=buildEvoChainHTML(p.id);
    const movesHTML=buildMovesHTML(p.id);
    const typeChartHTML=buildTypeChartHTML(p);
    const click=clickable?`onclick="handleCardClick(this,${p.id})"`:'';
    const isFR=frExclusive.has(p.id),isLG=lgExclusive.has(p.id);
    const verClass=isFR?' fr-exclusive':isLG?' lg-exclusive':'';
    const verBadge=isFR?'<span class="ver-badge fr">FR</span>':isLG?'<span class="ver-badge lg">LG</span>':'';
    return `<div class="card${verClass}" data-id="${p.id}" ${click}>
        ${verBadge}
        ${clickable?'<span class="team-count-badge">0</span>':''}
        <span class="id-badge">#${String(p.id).padStart(3,'0')}</span>
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png" alt="${p.name}" loading="lazy">
        <div class="card-header"><span class="card-name">${p.name}</span>
        <div class="type-box">${p.types.map(t=>`<span class="type-pill" style="background:${typeColors[t]}">${t}</span>`).join('')}</div></div>
        <div class="section-stats${sH}"><div class="stats-box">${statsHTML}</div><div class="card-total">TOTAL: ${p.total}</div></div>
        ${typeChartHTML?`<div class="section-typechart${tcH}">${typeChartHTML}</div>`:''}
        ${evoHTML?`<div class="section-evo${eH}">${evoHTML}</div>`:''}
        ${movesHTML?`<div class="section-moves${mH}">${movesHTML}</div>`:''}
    </div>`;
}

function updateSortUI(){
    document.querySelectorAll('.btn-sort').forEach(btn=>{
        const s=activeSorts.find(x=>x.stat===btn.dataset.stat);
        if(s){btn.classList.add('active');btn.innerHTML=`${s.stat.toUpperCase()} ${s.dir==='desc'?'&#9660;':'&#9650;'} <span style="background:var(--pk-red);color:white;border-radius:10px;padding:0 4px;font-size:0.6rem">${activeSorts.indexOf(s)+1}</span>`;}
        else{btn.classList.remove('active');btn.innerHTML=btn.dataset.stat.toUpperCase();}
    });
}

function init(){
    const fc=document.getElementById('type-filters');
    Object.keys(typeColors).forEach(type=>{
        const s=document.createElement('span');s.className='type-pill';s.style.backgroundColor=typeColors[type];s.innerText=type;s.onclick=()=>toggleFilter(type,s);fc.insertBefore(s,fc.lastElementChild);
    });
    const sc=document.getElementById('sort-btns');
    ['id','hp','atk','def','spa','spd','spe','total'].forEach(s=>{
        const b=document.createElement('button');b.className='btn-sort';b.dataset.stat=s;b.innerText=s.toUpperCase();b.onclick=()=>handleSort(s);sc.appendChild(b);
    });
    addTeamRow();render();
    initDrawerShowRow();
}
init();
