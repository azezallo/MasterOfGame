const urlParams = new URLSearchParams(window.location.search);
const provinceId = urlParams.get('id');

if (!provinceId) {
    alert("Не вказано ID провінції!");
    window.location.href = 'svg_map.html';
}

// Dynamically load the province data script
const script = document.createElement('script');
script.src = `../out/province_${provinceId}_data.js`;
script.onload = () => {
    initProvinceMap();
};
script.onerror = () => {
    alert(`Помилка завантаження даних для провінції ${provinceId}. Переконайтеся, що ви згенерували мапи (npm start).`);
};
document.head.appendChild(script);

function initProvinceMap() {
    if (typeof provinceData === 'undefined') {
        alert("Дані провінції не завантажились.");
        return;
    }

    const TILE_SIZE = 40; // Scale for province maps (1 cell = 1 tile = 40px)
    const width = provinceData.config.width;
    const height = provinceData.config.height;

    const svgWidth = width * TILE_SIZE;
    const svgHeight = height * TILE_SIZE;

    const container = document.getElementById('map-container');
    const tooltip = document.getElementById('tooltip');
    
    document.getElementById('province-title').innerText = `Провінція ${provinceId}`;

    // Create SVG Element
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("id", "map-svg");
    svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
    svg.setAttribute("width", svgWidth);
    svg.setAttribute("height", svgHeight);

    // 1. Add Background Image Layer
    const bgImage = document.createElementNS(svgNS, "image");
    bgImage.setAttribute("href", `../out/province_${provinceId}.jpg`);
    bgImage.setAttribute("x", "0");
    bgImage.setAttribute("y", "0");
    bgImage.setAttribute("width", svgWidth);
    bgImage.setAttribute("height", svgHeight);
    bgImage.style.imageRendering = "pixelated";
    svg.appendChild(bgImage);

    const layerSettlements = document.createElementNS(svgNS, "g");
    svg.appendChild(layerSettlements);
    container.appendChild(svg);

    // 2. Draw Settlements (Invisible Click Targets)
    if (provinceData.political && provinceData.political.settlements) {
        for (const s of provinceData.political.settlements) {
            
            // Calculate center
            let cx = s.localX * TILE_SIZE + TILE_SIZE / 2;
            let cy = s.localY * TILE_SIZE + TILE_SIZE / 2;
            
            let w = TILE_SIZE;
            let h = TILE_SIZE;
            let r = TILE_SIZE / 2;
            
            if (s.type === 'capital') { 
                r = TILE_SIZE * 1.5; 
                w = TILE_SIZE * 3;
                h = TILE_SIZE * 3;
            } else if (s.type === 'city') {
                cx += TILE_SIZE / 2;
                cy += TILE_SIZE / 2;
                r = TILE_SIZE;
                w = TILE_SIZE * 2;
                h = TILE_SIZE * 2;
            } else if (s.type === 'village') {
                r = TILE_SIZE / 2;
            }
            
            // We can draw a transparent rect or circle over the settlement
            const rect = document.createElementNS(svgNS, "rect");
            rect.setAttribute("x", cx - w/2);
            rect.setAttribute("y", cy - h/2);
            rect.setAttribute("width", w);
            rect.setAttribute("height", h);
            rect.setAttribute("fill", "transparent");
            rect.setAttribute("class", "settlement");
            
            rect.addEventListener('mousemove', (e) => {
                const types = { 'capital': 'Столиця', 'city': 'Місто', 'village': 'Село' };
                tooltip.innerHTML = `<b>${types[s.type]} (Фракція ${s.factionId})</b><br>Клікніть для переходу на рівень поселення.`;
                tooltip.style.display = 'block';
                tooltip.style.left = (e.pageX + 15) + 'px';
                tooltip.style.top = (e.pageY + 15) + 'px';
                e.stopPropagation();
            });
            
            rect.addEventListener('mouseout', () => {
                tooltip.style.display = 'none';
            });
            
            rect.addEventListener('click', (e) => {
                alert(`Drill-down: Завантаження локації для ${s.type} у глобальних координатах (${s.x}, ${s.y})... (Рівень 4)`);
                e.stopPropagation();
            });
            
            layerSettlements.appendChild(rect);
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
}
