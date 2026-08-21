// Wait for data to load
if (typeof mapData === 'undefined') {
    alert("mapData не знайдено! Переконайтеся, що ви спершу запустили 'npm start'.");
}

const TILE_SIZE = 15; // Matching backend scale
const width = mapData.config.width;
const height = mapData.config.height;

const svgWidth = width * TILE_SIZE;
const svgHeight = height * TILE_SIZE;

const container = document.getElementById('map-container');
const tooltip = document.getElementById('tooltip');

// Create SVG Element
const svgNS = "http://www.w3.org/2000/svg";
const svg = document.createElementNS(svgNS, "svg");
svg.setAttribute("id", "map-svg");
svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
svg.setAttribute("width", svgWidth);
svg.setAttribute("height", svgHeight);

// 1. Add Background Image Layer
const bgImage = document.createElementNS(svgNS, "image");
bgImage.setAttribute("href", "../out/rendered_map.jpg");
bgImage.setAttribute("x", "0");
bgImage.setAttribute("y", "0");
bgImage.setAttribute("width", svgWidth);
bgImage.setAttribute("height", svgHeight);
// This keeps the image sharp instead of blurry if scaled
bgImage.style.imageRendering = "pixelated";
svg.appendChild(bgImage);

// Layers for toggling
const layerBorders = document.createElementNS(svgNS, "g");
const layerRoads = document.createElementNS(svgNS, "g");
const layerSettlements = document.createElementNS(svgNS, "g");

svg.appendChild(layerBorders);
svg.appendChild(layerRoads);
svg.appendChild(layerSettlements);

container.appendChild(svg);

// --- Drawing Logic ---

// Helper: Get cell center
function getCenter(x, y) {
    return {
        cx: x * TILE_SIZE + TILE_SIZE / 2,
        cy: y * TILE_SIZE + TILE_SIZE / 2
    };
}

const factionColors = ['#ff4444', '#4444ff', '#44ff44', '#ffff44', '#ff44ff', '#44ffff'];

// 2. Draw Borders (Factions AND Wildlands)
if (mapData.political && mapData.political.factionMap) {
    // We group cells by faction, and use 'wild' for null
    const factionPaths = {};
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (mapData.elevation[y][x] <= mapData.config.oceanLevel) continue; // Skip ocean
            
            let f = mapData.political.factionMap[y][x];
            if (f === null) f = 'wild';
            
            if (!factionPaths[f]) factionPaths[f] = "";
            factionPaths[f] += `M ${x*TILE_SIZE} ${y*TILE_SIZE} h ${TILE_SIZE} v ${TILE_SIZE} h -${TILE_SIZE} Z `;
        }
    }
    
    for (const f in factionPaths) {
        // F is a string here, parse it
        const isWild = (f === 'wild' || parseInt(f) < 0);
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", factionPaths[f]);
        path.setAttribute("class", "faction-polygon");
        
        // Wildlands have a greyish style, factions have colors
        if (isWild) {
            path.setAttribute("fill", "#888888");
        } else {
            const color = factionColors[parseInt(f) % factionColors.length];
            path.setAttribute("fill", color);
        }
        
        path.addEventListener('mousemove', (e) => {
            if (isWild) {
                const wildId = f === 'wild' ? '' : Math.abs(parseInt(f));
                tooltip.innerHTML = `<b>Дикі Землі ${wildId}</b><br>Клікніть для переходу на регіональний рівень.`;
            } else {
                tooltip.innerHTML = `<b>Королівство Фракції ${f}</b><br>Клікніть для переходу на регіональний рівень.`;
            }
            tooltip.style.display = 'block';
            tooltip.style.left = (e.pageX + 15) + 'px';
            tooltip.style.top = (e.pageY + 15) + 'px';
        });
        
        path.addEventListener('mouseout', () => {
            tooltip.style.display = 'none';
        });
        
        path.addEventListener('click', () => {
            window.location.href = `regional_map.html?id=${f}`;
        });
        
        layerBorders.appendChild(path);
    }
}

// 3. Draw Settlements (Invisible Click Targets)
// Visuals are baked into the PNG, but we still want them clickable!
if (mapData.political && mapData.political.settlements) {
    for (const s of mapData.political.settlements) {
        if (s.type === 'village') continue; // Skip villages on global map
        
        const c = getCenter(s.x, s.y);
        
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", c.cx);
        circle.setAttribute("cy", c.cy);
        circle.setAttribute("r", s.type === 'capital' ? "20" : "10"); // Large invisible click area
        circle.setAttribute("fill", "transparent"); // Invisible!
        circle.setAttribute("class", "settlement");
        
        circle.addEventListener('mousemove', (e) => {
            const types = { 'capital': 'Столиця', 'city': 'Місто' };
            tooltip.innerHTML = `<b>${types[s.type]} (Фракція ${s.factionId})</b><br>Клікніть для переходу на рівень міста.`;
            tooltip.style.display = 'block';
            tooltip.style.left = (e.pageX + 15) + 'px';
            tooltip.style.top = (e.pageY + 15) + 'px';
            e.stopPropagation(); // Prevent polygon tooltip from overriding
        });
        
        circle.addEventListener('mouseout', () => {
            tooltip.style.display = 'none';
        });
        
        circle.addEventListener('click', (e) => {
            alert(`Drill-down: Завантаження локації для ${s.type} у координатах (${s.x}, ${s.y})...`);
            e.stopPropagation();
        });
        
        layerSettlements.appendChild(circle);
    }
}

setupPanZoom('map-container', 'map-svg', 'zoom-slider', 'zoom-value', 'tooltip');

// Toggles
document.getElementById('show-borders').addEventListener('change', (e) => {
    layerBorders.style.display = e.target.checked ? '' : 'none';
});
