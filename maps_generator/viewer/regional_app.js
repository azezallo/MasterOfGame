const urlParams = new URLSearchParams(window.location.search);
const regionId = urlParams.get('id');

if (!regionId) {
    alert("Не вказано ID регіону!");
    window.location.href = 'svg_map.html';
}

// Dynamically load the region data script
const script = document.createElement('script');
script.src = `../out/region_${regionId}_data.js`;
script.onload = () => {
    initRegionalMap();
};
script.onerror = () => {
    alert(`Помилка завантаження даних для регіону ${regionId}. Переконайтеся, що ви згенерували мапи.`);
};
document.head.appendChild(script);

function initRegionalMap() {
    if (typeof regionData === 'undefined') {
        alert("Дані регіону не завантажились.");
        return;
    }

    const TILE_SIZE = 30; // 2x scale for regional maps
    const width = regionData.config.width;
    const height = regionData.config.height;

    const svgWidth = width * TILE_SIZE;
    const svgHeight = height * TILE_SIZE;

    const container = document.getElementById('map-container');
    const tooltip = document.getElementById('tooltip');
    
    const isWild = parseInt(regionId) < 0;
    
    let regionTitle = `Регіон: Дикі Землі ${Math.abs(regionId)}`;
    if (!isWild) {
        const factionObj = regionData.political.factions ? regionData.political.factions.find(fac => fac.id === parseInt(regionId)) : null;
        if (factionObj) {
            const govMap = { 'monarchy': 'Монархія', 'republic': 'Республіка', 'theocracy': 'Теократія', 'tribal': 'Вождівство', 'federation': 'Федерація' };
            const govText = factionObj.government ? ` [${govMap[factionObj.government]}]` : '';
            regionTitle = `${factionObj.name}${govText}`;
        } else {
            regionTitle = `Регіон: Королівство Фракції ${regionId}`;
        }
    }
    document.getElementById('region-title').innerText = regionTitle;

    // Create SVG Element
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("id", "map-svg");
    svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
    svg.setAttribute("width", svgWidth);
    svg.setAttribute("height", svgHeight);

    // 1. Add Background Image Layer
    const bgImage = document.createElementNS(svgNS, "image");
    bgImage.setAttribute("href", `../out/region_${regionId}.jpg`);
    bgImage.setAttribute("x", "0");
    bgImage.setAttribute("y", "0");
    bgImage.setAttribute("width", svgWidth);
    bgImage.setAttribute("height", svgHeight);
    bgImage.style.imageRendering = "pixelated";
    svg.appendChild(bgImage);

    const layerBorders = document.createElementNS(svgNS, "g");
    const layerSettlements = document.createElementNS(svgNS, "g");

    svg.appendChild(layerBorders);
    svg.appendChild(layerSettlements);
    container.appendChild(svg);

    // Helper: Get cell center
    function getCenter(x, y) {
        return {
            cx: x * TILE_SIZE + TILE_SIZE / 2,
            cy: y * TILE_SIZE + TILE_SIZE / 2
        };
    }

    // 2. Draw Province Borders and Out-of-bounds overlay
    if (regionData.political && regionData.political.provinceMap) {
        const provincePaths = {};
        let outOfBoundsPathStr = "";
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const f = regionData.political.factionMap[y][x];
                
                // If this tile does not belong to the current region, add it to outOfBounds
                if (f != parseInt(regionId)) {
                    outOfBoundsPathStr += `M ${x*TILE_SIZE} ${y*TILE_SIZE} h ${TILE_SIZE} v ${TILE_SIZE} h -${TILE_SIZE} Z `;
                } else {
                    // Otherwise, add to the corresponding province path
                    const p = regionData.political.provinceMap[y][x];
                    if (p !== null) {
                        if (!provincePaths[p]) provincePaths[p] = "";
                        provincePaths[p] += `M ${x*TILE_SIZE} ${y*TILE_SIZE} h ${TILE_SIZE} v ${TILE_SIZE} h -${TILE_SIZE} Z `;
                    }
                }
            }
        }
        
        // Draw Out-of-bounds Overlay
        if (outOfBoundsPathStr) {
            const outPath = document.createElementNS(svgNS, "path");
            outPath.setAttribute("d", outOfBoundsPathStr);
            outPath.setAttribute("fill", "#555555");
            outPath.setAttribute("fill-opacity", "0.4");
            outPath.setAttribute("stroke", "none");
            outPath.style.pointerEvents = "none"; // Make sure it doesn't block clicks/hover
            layerBorders.appendChild(outPath);
        }
        
        const provinceColors = ['#ffaaaa', '#aaffaa', '#aaaaff', '#ffffaa', '#ffaaff', '#aaffff', '#ffddaa', '#ddffaa'];
        
        for (const p in provincePaths) {
            const path = document.createElementNS(svgNS, "path");
            path.setAttribute("d", provincePaths[p]);
            path.setAttribute("class", "province-polygon");
            
            const color = provinceColors[parseInt(p) % provinceColors.length];
            path.setAttribute("fill", color);
            
            path.addEventListener('mousemove', (e) => {
                let cityName = `Зона ${p}`;
                let factionName = "";
                if (!isWild) {
                    const city = regionData.political.settlements.find(s => s.provinceId == p && (s.type === 'city' || s.type === 'capital'));
                    const factionObj = regionData.political.factions ? regionData.political.factions.find(fac => fac.id === parseInt(regionId)) : null;
                    if (factionObj) {
                        const govMap = { 'monarchy': 'Монархія', 'republic': 'Республіка', 'theocracy': 'Теократія', 'tribal': 'Вождівство', 'federation': 'Федерація' };
                        const govText = factionObj.government ? ` [${govMap[factionObj.government]}]` : '';
                        factionName = `<br><i>${factionObj.name}${govText}</i>`;
                    }
                    
                    if (city && city.name) {
                        cityName = `Провінція ${city.name}`;
                    } else if (city) {
                        cityName = city.type === 'capital' ? `Столична Провінція` : `Провінція Міста`;
                    } else {
                        cityName = `Провінція ${p}`;
                    }
                }
                
                tooltip.innerHTML = `<b>${cityName}</b>${factionName}<br>Клікніть для переходу на локальний рівень (Рівень 3).`;
                tooltip.style.display = 'block';
                tooltip.style.left = (e.pageX + 15) + 'px';
                tooltip.style.top = (e.pageY + 15) + 'px';
            });
            
            path.addEventListener('mouseout', () => {
                tooltip.style.display = 'none';
            });
            
            path.addEventListener('click', () => {
                window.location.href = `province_map.html?id=${p}`;
            });
            
            layerBorders.appendChild(path);
        }
    }

    // 3. Draw Settlements (Invisible Click Targets)
    if (regionData.political && regionData.political.settlements) {
        for (const s of regionData.political.settlements) {
            if (s.type === 'village') continue; // Skip villages on regional map
            
            const c = getCenter(s.localX, s.localY);
            
            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", c.cx);
            circle.setAttribute("cy", c.cy);
            let r = 10;
            if (s.type === 'capital') r = 30;
            if (s.type === 'city') r = 20;
            
            circle.setAttribute("r", r);
            circle.setAttribute("fill", "transparent");
            circle.setAttribute("class", "settlement");
            
            circle.addEventListener('mousemove', (e) => {
                const types = { 'capital': 'Столиця', 'city': 'Місто', 'village': 'Село' };
                const factionObj = regionData.political.factions ? regionData.political.factions.find(fac => fac.id === s.factionId) : null;
                const factionName = factionObj ? factionObj.name : `Фракція ${s.factionId}`;
                const govMap = { 'monarchy': 'Монархія', 'republic': 'Республіка', 'theocracy': 'Теократія', 'tribal': 'Вождівство', 'federation': 'Федерація' };
                const govText = factionObj && factionObj.government ? ` [${govMap[factionObj.government]}]` : '';
                const settlementName = s.name ? s.name : `${types[s.type]}`;
                
                tooltip.innerHTML = `<b>${settlementName}</b><br><i>${types[s.type]}, ${factionName}${govText}</i><br>Клікніть для переходу на рівень поселення.`;
                tooltip.style.display = 'block';
                tooltip.style.left = (e.pageX + 15) + 'px';
                tooltip.style.top = (e.pageY + 15) + 'px';
                e.stopPropagation();
            });
            
            circle.addEventListener('mouseout', () => {
                tooltip.style.display = 'none';
            });
            
            circle.addEventListener('click', (e) => {
                alert(`Drill-down: Завантаження локації для ${s.name || s.type} у глобальних координатах (${s.x}, ${s.y})...`);
                e.stopPropagation();
            });
            
            layerSettlements.appendChild(circle);
        }
    }

    // UI Controls
    const zoomSlider = document.getElementById('zoom-slider');
    const zoomValue = document.getElementById('zoom-value');

    function updateZoom() {
        const scale = parseFloat(zoomSlider.value);
        zoomValue.textContent = Math.round(scale * 100) + '%';
        svg.style.transform = `scale(${scale})`;
    }

    zoomSlider.addEventListener('input', updateZoom);
    updateZoom();

    let isDragging = false;
    let startX, startY, scrollLeft, scrollTop;

    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.pageX - container.offsetLeft;
        startY = e.pageY - container.offsetTop;
        scrollLeft = container.scrollLeft;
        scrollTop = container.scrollTop;
    });

    container.addEventListener('mouseleave', () => { isDragging = false; });
    container.addEventListener('mouseup', () => { isDragging = false; });

    container.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        tooltip.style.display = 'none';
        const x = e.pageX - container.offsetLeft;
        const y = e.pageY - container.offsetTop;
        const walkX = (x - startX) * 1.5;
        const walkY = (y - startY) * 1.5;
        container.scrollLeft = scrollLeft - walkX;
        container.scrollTop = scrollTop - walkY;
    });

    container.addEventListener('scroll', () => {
        tooltip.style.display = 'none';
    });

    document.getElementById('show-borders').addEventListener('change', (e) => {
        layerBorders.style.display = e.target.checked ? '' : 'none';
    });
}
