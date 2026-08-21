function setupPanZoom(containerId, svgId, sliderId, valueId, tooltipId) {
    const container = document.getElementById(containerId);
    const svg = document.getElementById(svgId);
    const zoomSlider = document.getElementById(sliderId);
    const zoomValue = document.getElementById(valueId);
    const tooltip = document.getElementById(tooltipId);

    if (!container || !svg) return;

    if (zoomSlider && zoomValue) {
        function updateZoom() {
            const scale = parseFloat(zoomSlider.value);
            zoomValue.textContent = Math.round(scale * 100) + '%';
            svg.style.transform = `scale(${scale})`;
        }
        zoomSlider.addEventListener('input', updateZoom);
        updateZoom();
    }

    let isDragging = false;
    let startX, startY;
    let scrollLeft, scrollTop;

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
        if (tooltip) tooltip.style.display = 'none'; // Hide tooltip while dragging
        const x = e.pageX - container.offsetLeft;
        const y = e.pageY - container.offsetTop;
        const walkX = (x - startX) * 1.5;
        const walkY = (y - startY) * 1.5;
        container.scrollLeft = scrollLeft - walkX;
        container.scrollTop = scrollTop - walkY;
    });

    container.addEventListener('scroll', () => {
        if (tooltip) tooltip.style.display = 'none'; // Hide tooltip on scroll
    });
}
