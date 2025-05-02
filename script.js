const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

const img = document.querySelector('.map-container img');
canvas.width = img.clientWidth;
canvas.height = img.clientHeight;

const mapElement = document.getElementById('hanoi-map');

let areas = [];
let locationsData = [];

// Fetch data and initialize map
fetch('./provinces.json')
  .then(response => response.json())
  .then(data => {
    initMap(data);
  })
  .catch(error => console.error('Error:', error));

function updateCanvasSize() {
    canvas.width = img.offsetWidth;
    canvas.height = img.offsetHeight;
    canvas.style.width = `${img.offsetWidth}px`;
    canvas.style.height = `${img.offsetHeight}px`;
}

window.addEventListener('resize', () => {
    updateCanvasSize();
    createMapAreas();
});

img.addEventListener('load', () => {
    updateCanvasSize();
    createMapAreas();
});

function createMapAreas() {
    mapElement.innerHTML = '';
    const scaleX = img.offsetWidth / img.naturalWidth;
    const scaleY = img.offsetHeight / img.naturalHeight;
    
    areas.forEach((area) => {
        const scaledCoords = area.coords.map((val, index) => {
            return index % 2 === 0 
                ? Math.round(val * scaleX) 
                : Math.round(val * scaleY);
        });
        
        const areaElement = document.createElement('area');
        areaElement.setAttribute('shape', area.shape);
        areaElement.setAttribute('coords', scaledCoords.join(','));
        areaElement.setAttribute('href', 'javascript:void(0)');
        mapElement.appendChild(areaElement);
    });
    
    setupEventListeners();
}

const drawOutline = (coords) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;
    
    ctx.moveTo(coords[0] * scaleX, coords[1] * scaleY);
    for (let i = 2; i < coords.length; i += 2) {
        ctx.lineTo(coords[i] * scaleX, coords[i + 1] * scaleY);
    }
    
    ctx.closePath();
    
    ctx.fillStyle = 'rgba(255, 165, 0, 0.3)';
    ctx.fill();
    
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();
};

const clearOutline = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

function initMap(provinces) {
    const mapImage = document.querySelector('.map-container img');
    const map = document.getElementById('hanoi-map');
    const canvas = document.getElementById('mapCanvas');
    const ctx = canvas.getContext('2d');

    // Lưu lại polygon cho từng district
    const polygons = provinces.hanoi_districts.map(d => ({
        ...d,
        coordsArr: d.coords ? d.coords.split(',').map(Number) : []
    }));

    function getScale() {
        const rect = mapImage.getBoundingClientRect();
        return {
            x: mapImage.naturalWidth / rect.width,
            y: mapImage.naturalHeight / rect.height
        };
    }

    function getEventPoint(e) {
        const rect = mapImage.getBoundingClientRect();
        let clientX, clientY;
        if (e.touches && e.touches[0]) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        const scale = getScale();
        return {
            x: (clientX - rect.left) * scale.x,
            y: (clientY - rect.top) * scale.y
        };
    }

    function isPointInPolygon(point, coords) {
        let inside = false;
        for (let i = 0, j = coords.length - 2; i < coords.length; i += 2) {
            const xi = coords[i], yi = coords[i + 1];
            const xj = coords[j], yj = coords[j + 1];
            const intersect = ((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
            j = i;
        }
        return inside;
    }

    function handleMapPointer(e) {
        e.preventDefault();
        const point = getEventPoint(e);

        let found = null;
        for (const district of polygons) {
            if (district.coordsArr.length && isPointInPolygon(point, district.coordsArr)) {
                found = district;
                break;
            }
        }

        if (found) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            highlightArea(found.coordsArr);
            showTooltip(found);
        }
    }

    function highlightArea(coordsArr) {
        const rect = mapImage.getBoundingClientRect();
        const scaleX = rect.width / mapImage.naturalWidth;
        const scaleY = rect.height / mapImage.naturalHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(coordsArr[0] * scaleX, coordsArr[1] * scaleY);
        for (let i = 2; i < coordsArr.length; i += 2) {
            ctx.lineTo(coordsArr[i] * scaleX, coordsArr[i + 1] * scaleY);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 152, 0, 0.4)';
        ctx.fill();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function updateCanvasSize() {
        const rect = mapImage.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
    }

    // Lắng nghe sự kiện trên canvas (overlay)
    canvas.addEventListener('click', handleMapPointer);
    canvas.addEventListener('touchstart', handleMapPointer, { passive: false });

    // Resize canvas khi thay đổi kích thước
    window.addEventListener('resize', () => {
        updateCanvasSize();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // Khởi tạo
    if (mapImage.complete) {
        updateCanvasSize();
    } else {
        mapImage.onload = updateCanvasSize;
    }
}

// Sửa lại hàm showTooltip
function showTooltip(district) {
    const tooltip = document.querySelector('.tooltip-box');
    const isDistrict = district.name.startsWith('Quận');
    const wardLabel = isDistrict ? 'Đơn vị hành chính cấp xã' : 'Đơn vị hành chính cấp xã';
    
    let content = `
        <div class="wards-content">
            <h4>${wardLabel} sau sáp nhập (${district.future_wards.total}):</h4>
            <div class="ward-list">
                ${district.future_wards.list.map(ward => `<span>${ward}</span>`).join('')}
            </div>
        </div>
        <div class="wards-toggle">
            <span><i>Xem ${wardLabel} hiện tại</i></span>
            <label class="switch">
                <input type="checkbox" class="wards-switch">
                <span class="slider"></span>
            </label>
        </div>
        <div class="current-wards-content" style="display: none">
            <h4>${wardLabel} hiện tại (${district.current_wards.total}):</h4>
            <div class="ward-list">
                ${district.current_wards.list.map(ward => `<span>${ward}</span>`).join('')}
            </div>
        </div>
    `;
    
    tooltip.innerHTML = content;

    const wardsSwitch = tooltip.querySelector('.wards-switch');
    const currentWardsContent = tooltip.querySelector('.current-wards-content');
    
    wardsSwitch.removeEventListener('change', handleSwitchChange);
    
    function handleSwitchChange() {
        currentWardsContent.style.display = this.checked ? 'block' : 'none';
        setTimeout(() => {
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
        }, 0);
    }
    
    wardsSwitch.addEventListener('change', handleSwitchChange);

    tooltip.addEventListener('touchmove', function(e) {
        e.stopPropagation();
    }, { passive: true });

    tooltip.style.display = 'block';
}

document.addEventListener('touchstart', function(e) {
    const tooltip = document.querySelector('.tooltip-box');
    if (tooltip.style.display === 'block' && !tooltip.contains(e.target) && !e.target.closest('area')) {
        tooltip.style.display = 'none';
    }
}, { passive: true });

function setupEventListeners() {
    document.querySelectorAll('area').forEach((area, index) => {
        area.addEventListener('mouseenter', () => {
            drawOutline(areas[index].coords);
        });
        area.addEventListener('mouseleave', clearOutline);

        area.addEventListener('mousemove', (event) => {
            const tooltip = document.querySelector('.tooltip-box');
            const tooltipRect = tooltip.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            if (tooltipRect.width + event.clientX < viewportWidth &&
                tooltipRect.height + event.clientY < viewportHeight) {
                tooltip.style.left = `${event.pageX + 10}px`;
                tooltip.style.top = `${event.pageY + 10}px`;
            }
        });
    });

    document.addEventListener('mousemove', (event) => {
        const tooltip = document.querySelector('.tooltip-box');
        if (!event.target.closest('area') && !tooltip.contains(event.target)) {
            hideTooltip();
        }
    });
}

window.addEventListener('resize', () => {
    const tooltip = document.querySelector('.tooltip-box');
    if (tooltip.classList.contains('active')) {
        tooltip.classList.remove('active');
    }
});