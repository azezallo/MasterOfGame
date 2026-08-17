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
                
                tooltip.innerHTML = `
                    <b>X: ${x}, Y: ${y}</b><br>
                    Біом: ${biome}<br>
                    Висота: ${elev}<br>
                    Температура: ${temp}<br>
                    Вологість: ${moist}
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

    // Function to render the active layers
    function render() {
        // Find which radio is checked
        let activeLayer = 'biomes';
        radios.forEach(r => {
            if (r.checked) activeLayer = r.value;
        });
        
        const showRivers = riversCheckbox.checked;

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
            
            // Clear previous river/lake indicators
            element.innerHTML = '';
            
            // Overlay rivers and lakes
            if (showRivers) {
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
        }
    }

    // Bind events
    radios.forEach(r => r.addEventListener('change', render));
    riversCheckbox.addEventListener('change', render);

    // Initial render
    render();
    console.log("Map rendered successfully.");
});
