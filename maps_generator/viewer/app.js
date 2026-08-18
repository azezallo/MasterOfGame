const BIOME_COLORS = {
    OCEAN: '#1C2E4A',
    BEACH: '#E6D2B5',
    CLIFF: '#5C5346',
    SCORCHED: '#555555',
    BARE: '#888888',
    TUNDRA: '#C5D0D9',
    SNOW: '#FFFFFF',
    TAIGA: '#99AA77',
    SHRUBLAND: '#889977',
    GRASSLAND: '#88AA55',
    TEMPERATE_DESERT: '#C9D29B',
    TEMPERATE_DECIDUOUS_FOREST: '#679459',
    TEMPERATE_RAIN_FOREST: '#448855',
    SUBTROPICAL_DESERT: '#D2B98B',
    TROPICAL_SEASONAL_FOREST: '#559944',
    TROPICAL_RAIN_FOREST: '#337755'
};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof mapData === 'undefined') {
        alert("Помилка: map_data.js не знайдено. Спочатку запустіть генератор (npm start)!");
        return;
    }

    const container = document.getElementById('map-container');
    const tooltip = document.getElementById('tooltip');
    
    // UI Controls
    const radios = document.querySelectorAll('input[name="layer"]');

    const width = mapData.config.width;
    const height = mapData.config.height;

    container.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${height}, 1fr)`;

    const tiles = [];

    // Initialize the grid
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            
            // Interaction: Tooltip
            tile.addEventListener('mouseenter', (e) => {
                const elev = mapData.elevation[y][x].toFixed(3);
                const temp = mapData.temperature[y][x].toFixed(3);
                const moist = mapData.moisture[y][x].toFixed(3);
                const biome = mapData.biomes[y][x];
                const mana = (mapData.magic[y][x] * 100).toFixed(0);
                
                let magicText = `Магія: ${mana}%`;
                if (mana >= 90) magicText += " (Вузол Сили)";
                else if (mana <= 10) magicText += " (Мертва Зона)";
                
                let politicalText = "";
                if (mapData.political) {
                    const faction = mapData.political.factionMap[y][x];
                    const settlement = mapData.political.settlementMap[y][x];
                    
                    if (elev > mapData.config.oceanLevel) {
                        if (faction !== null) {
                            politicalText += `<br>Фракція: ${faction}`;
                        } else {
                            politicalText += `<br><i>Дикі Землі (Wildlands)</i>`;
                        }
                    }
                    
                    if (settlement) {
                        const types = { 'capital': 'Столиця', 'city': 'Місто', 'village': 'Село' };
                        politicalText += `<br><b>Поселення: ${types[settlement]}</b>`;
                    }
                    if (mapData.political.roadMap[y][x]) {
                        politicalText += `<br><i>Дорога</i>`;
                    }
                }
                
                tooltip.innerHTML = `
                    <b>X: ${x}, Y: ${y}</b><br>
                    Висота: ${elev}<br>
                    Температура: ${temp}<br>
                    Вологість: ${moist}<br>
                    Біом: ${biome}<br>
                    ${magicText}
                    ${politicalText}
                `;
                tooltip.style.display = 'block';
                tooltip.style.left = (e.pageX + 15) + 'px';
                tooltip.style.top = (e.pageY + 15) + 'px';
            });
            tile.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
            tile.addEventListener('mousemove', (e) => {
                tooltip.style.left = (e.pageX + 15) + 'px';
                tooltip.style.top = (e.pageY + 15) + 'px';
            });

            container.appendChild(tile);
            tiles.push({ element: tile, x, y });
        }
    }

    const riversCheckbox = document.getElementById('layer-rivers');
    const magicCheckbox = document.getElementById('layer-magic');
    const magicOpacity = document.getElementById('magic-opacity');

    // Function to render the active layers
    function render() {
        // Find which radio is checked
        let activeLayer = 'biomes';
        radios.forEach(r => {
            if (r.checked) activeLayer = r.value;
        });
        
        const showRivers = riversCheckbox.checked;
        const showMagic = magicCheckbox.checked;
        const mOpacity = parseFloat(magicOpacity.value);

        for (let i = 0; i < tiles.length; i++) {
            const { element, x, y } = tiles[i];
            
            // Render base layer
            if (activeLayer === 'elevation') {
                const elev = mapData.elevation[y][x];
                const v = Math.floor(elev * 255);
                element.style.backgroundColor = `rgb(${v}, ${v}, ${v})`;
            } 
            else if (activeLayer === 'temperature') {
                const temp = mapData.temperature[y][x];
                const r = Math.floor(temp * 255);
                const b = Math.floor((1 - temp) * 255);
                element.style.backgroundColor = `rgb(${r}, 0, ${b})`;
            }
            else if (activeLayer === 'moisture') {
                const moist = mapData.moisture[y][x];
                const r = Math.floor(200 * (1 - moist));
                const g = Math.floor(200 * (1 - moist));
                const b = Math.floor(50 + 100 * moist);
                element.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            }
            else if (activeLayer === 'biomes') {
                const biome = mapData.biomes[y][x];
                element.style.backgroundColor = BIOME_COLORS[biome] || '#ff00ff';
            }
            else if (activeLayer === 'political') {
                const elev = mapData.elevation[y][x];
                if (elev <= mapData.config.oceanLevel) {
                    element.style.backgroundColor = '#1a3b5c'; // Ocean color
                } else {
                    const factionColors = ['#ff9999', '#99ccff', '#99ff99', '#ffff99', '#e6ccff', '#ffcc99'];
                    const faction = mapData.political.factionMap[y][x];
                    
                    if (faction !== null) {
                        element.style.backgroundColor = factionColors[faction % factionColors.length];
                    } else {
                        element.style.backgroundColor = '#aaaaaa';
                    }
                }
            }
            
            // Clear previous indicators
            element.innerHTML = '';
            
            // Overlay Rivers/Lakes (if not in political mode, or if we want them always, let's keep them if checked)
            if (showRivers && activeLayer !== 'political') {
                if (mapData.lakes[y][x]) {
                    const lakeMarker = document.createElement('div');
                    lakeMarker.style.width = '100%';
                    lakeMarker.style.height = '100%';
                    lakeMarker.style.backgroundColor = '#1C2E4A'; // Ocean color for lakes
                    element.appendChild(lakeMarker);
                }
                else if (mapData.rivers[y][x]) {
                    const riverMarker = document.createElement('div');
                    riverMarker.style.width = '100%';
                    riverMarker.style.height = '100%';
                    riverMarker.style.backgroundColor = '#3498db';
                    element.appendChild(riverMarker);
                }
            }
            
            // Overlay magic density
            if (showMagic) {
                const mana = mapData.magic[y][x];
                const magicOverlay = document.createElement('div');
                magicOverlay.style.width = '100%';
                magicOverlay.style.height = '100%';
                magicOverlay.style.position = 'absolute';
                magicOverlay.style.top = '0';
                magicOverlay.style.left = '0';
                // Purple color: rgba(138, 43, 226)
                magicOverlay.style.backgroundColor = `rgba(138, 43, 226, ${mana * mOpacity})`;
                magicOverlay.style.pointerEvents = 'none'; // so tooltips still work
                
                // Ensure the cell has position relative to contain the absolute overlay
                element.style.position = 'relative';
                element.appendChild(magicOverlay);
            }
            
            // Overlay Roads and Settlements (Political features)
            if (activeLayer === 'political' || activeLayer === 'biomes') {
                element.style.position = 'relative';
                
                if (mapData.political) {
                    // Roads
                    if (mapData.political.roadMap[y][x]) {
                        const roadMarker = document.createElement('div');
                        roadMarker.style.width = '100%';
                        roadMarker.style.height = '100%';
                        roadMarker.style.backgroundColor = '#8B4513'; // SaddleBrown
                        roadMarker.style.position = 'absolute';
                        roadMarker.style.top = '0';
                        roadMarker.style.left = '0';
                        roadMarker.style.opacity = '0.6';
                        roadMarker.style.pointerEvents = 'none';
                        element.appendChild(roadMarker);
                    }
                    
                    // Settlements
                    const settlement = mapData.political.settlementMap[y][x];
                    if (settlement) {
                        const sMarker = document.createElement('div');
                        sMarker.style.position = 'absolute';
                        sMarker.style.top = '0';
                        sMarker.style.left = '0';
                        sMarker.style.width = '100%';
                        sMarker.style.height = '100%';
                        sMarker.style.display = 'flex';
                        sMarker.style.alignItems = 'center';
                        sMarker.style.justifyContent = 'center';
                        sMarker.style.pointerEvents = 'none';
                        
                        if (settlement === 'capital') {
                            sMarker.innerHTML = '★';
                            sMarker.style.color = '#fff';
                            sMarker.style.fontSize = '12px';
                            sMarker.style.textShadow = '0 0 2px #000';
                            sMarker.style.backgroundColor = 'rgba(0,0,0,0.5)'; // Darken background slightly to stand out
                        } else if (settlement === 'city') {
                            sMarker.innerHTML = '●';
                            sMarker.style.color = '#fff';
                            sMarker.style.fontSize = '8px';
                            sMarker.style.textShadow = '0 0 1px #000';
                            sMarker.style.backgroundColor = 'rgba(0,0,0,0.3)';
                        } else if (settlement === 'village') {
                            sMarker.innerHTML = '▪';
                            sMarker.style.color = '#eee';
                            sMarker.style.fontSize = '6px';
                            sMarker.style.textShadow = '0 0 1px #000';
                        }
                        
                        element.appendChild(sMarker);
                    }
                }
            }
        }
    }

    // Bind events
    radios.forEach(r => r.addEventListener('change', render));
    riversCheckbox.addEventListener('change', render);
    magicCheckbox.addEventListener('change', render);
    magicOpacity.addEventListener('input', render);

    // Initial render
    render();
    console.log("Map rendered successfully.");
});
