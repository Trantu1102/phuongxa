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
    const mapImage = document.querySelector('img[usemap="#image-map"]');
    const map = document.getElementById('hanoi-map');
    const canvas = document.getElementById('mapCanvas');
    const ctx = canvas.getContext('2d');

    function isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 2; i < polygon.length; i += 2) {
            const xi = polygon[i], yi = polygon[i + 1];
            const xj = polygon[j], yj = polygon[j + 1];
            
            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
            
            j = i;
        }
        return inside;
    }

    function createAreas() {
        // Clear existing areas
        while (map.firstChild) {
            map.removeChild(map.firstChild);
        }

        provinces.hanoi_districts.forEach(district => {
            if (!district.coords) return;

            const area = document.createElement('area');
            area.shape = 'poly';
            area.coords = district.coords;
            area.href = '#';
            area.dataset.id = district.id;
            area.setAttribute('data-original-coords', district.coords);

            const coordsArray = district.coords.split(',').map(Number);
            area.dataset.coords = JSON.stringify(coordsArray);

            map.appendChild(area);
        });

        // Add click handler to map container
        const mapContainer = document.querySelector('.map-container');
        
        // Xóa event listeners cũ nếu có
        mapContainer.removeEventListener('click', handleMapClick);
        mapContainer.removeEventListener('touchstart', handleMapClick);
        
        // Thêm event listeners mới
        mapContainer.addEventListener('click', handleMapClick);
        mapContainer.addEventListener('touchstart', handleMapClick, { passive: false });
        
        // Ngăn chặn zoom khi double tap trên mobile
        mapContainer.addEventListener('touchend', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    function handleMapClick(e) {
        e.preventDefault();
        const rect = mapImage.getBoundingClientRect();
        
        // Lấy tọa độ điểm chạm cho cả click và touch
        let clientX, clientY;
        if (e.touches && e.touches[0]) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        // Tính toán tỷ lệ scale
        const scaleX = mapImage.naturalWidth / rect.width;
        const scaleY = mapImage.naturalHeight / rect.height;

        // Tính toán tọa độ điểm trong hệ tọa độ của ảnh
        const point = {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };

        // Tìm vùng được chọn
        let clickedArea = null;
        document.querySelectorAll('area').forEach(area => {
            const coords = JSON.parse(area.dataset.coords);
            if (isPointInPolygon(point, coords)) {
                clickedArea = area;
            }
        });

        if (clickedArea) {
            // Clear previous highlights
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            document.querySelectorAll('area[data-selected="true"]').forEach(a => {
                a.removeAttribute('data-selected');
            });

            // Highlight new area
            clickedArea.setAttribute('data-selected', 'true');
            highlightArea(clickedArea.coords);

            const district = provinces.hanoi_districts.find(d => 
                d.id === parseInt(clickedArea.dataset.id));
            if (district) {
                showTooltip(district);
            }
        }
    }

    function highlightArea(coords) {
        const coordsArray = coords.split(',').map(Number);
        const rect = mapImage.getBoundingClientRect();
        const scaleX = rect.width / mapImage.naturalWidth;
        const scaleY = rect.height / mapImage.naturalHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(coordsArray[0] * scaleX, coordsArray[1] * scaleY);
        
        for (let i = 2; i < coordsArray.length; i += 2) {
            ctx.lineTo(coordsArray[i] * scaleX, coordsArray[i + 1] * scaleY);
        }
        
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 152, 0, 0.4)';
        ctx.fill();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Initial setup
    if (mapImage.complete) {
        createAreas();
        updateCanvasSize();
    } else {
        mapImage.onload = function() {
            createAreas();
            updateCanvasSize();
        };
    }

    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            updateCanvasSize();
            createAreas();
            const selectedArea = document.querySelector('area[data-selected="true"]');
            if (selectedArea) {
                highlightArea(selectedArea.coords);
            }
        }, 250);
    });
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

    // Thêm xử lý cho mobile
    const wardsSwitch = tooltip.querySelector('.wards-switch');
    const currentWardsContent = tooltip.querySelector('.current-wards-content');
    
    // Xóa event listener cũ nếu có
    wardsSwitch.removeEventListener('change', handleSwitchChange);
    
    // Thêm event listener mới
    function handleSwitchChange() {
        currentWardsContent.style.display = this.checked ? 'block' : 'none';
        // Cập nhật lại vị trí tooltip sau khi thay đổi nội dung
        setTimeout(() => {
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
        }, 0);
    }
    
    wardsSwitch.addEventListener('change', handleSwitchChange);

    // Ngăn chặn việc đóng tooltip khi scroll trong tooltip
    tooltip.addEventListener('touchmove', function(e) {
        if (this.scrollHeight > this.clientHeight) {
            e.stopPropagation();
        } else {
            e.preventDefault();
        }
    }, { passive: false });

    // Đặt vị trí tooltip cho mobile
    if (window.innerWidth <= 768) {
        tooltip.style.position = 'fixed';
        tooltip.style.left = '50%';
        tooltip.style.top = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
        tooltip.style.maxWidth = '90vw';
        tooltip.style.maxHeight = '80vh';
        tooltip.style.overflow = 'auto';
    }

    tooltip.style.display = 'block';
    handleTooltipScroll();
}

// Thêm hàm hideTooltip nếu chưa có
function hideTooltip() {
    const tooltip = document.querySelector('.tooltip-box');
    tooltip.style.display = 'none';
    // Clear highlight trên canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    removeTooltipScroll();
}

// Cập nhật event listeners để xử lý việc đóng tooltip
document.addEventListener('click', function(e) {
    const tooltip = document.querySelector('.tooltip-box');
    const mapContainer = document.querySelector('.map-container');
    
    // Kiểm tra nếu click outside tooltip và map container
    if (!tooltip.contains(e.target) && !mapContainer.contains(e.target)) {
        hideTooltip();
    }
}, false);

// Cập nhật xử lý touch events cho mobile
document.addEventListener('touchstart', function(e) {
    const tooltip = document.querySelector('.tooltip-box');
    const mapContainer = document.querySelector('.map-container');
    
    if (tooltip.style.display === 'block' && 
        !tooltip.contains(e.target) && 
        !mapContainer.contains(e.target)) {
        hideTooltip();
    }
}, { passive: false });

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

// Thêm vào cuối file
function handleTooltipScroll() {
    if (window.innerWidth <= 768) {
        document.body.classList.add('tooltip-open');
    }
}

function removeTooltipScroll() {
    document.body.classList.remove('tooltip-open');
}
