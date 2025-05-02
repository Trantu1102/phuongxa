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

    // Đợi hình ảnh load xong
    mapImage.onload = function() {
        updateCanvasSize();
    };

    // Cập nhật kích thước canvas và scale tọa độ
    function updateCanvasSize() {
        const rect = mapImage.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // Lưu tỷ lệ scale để điều chỉnh tọa độ
        canvas.scaleX = rect.width / mapImage.naturalWidth;
        canvas.scaleY = rect.height / mapImage.naturalHeight;
    }

    // Cập nhật khi resize window
    window.addEventListener('resize', updateCanvasSize);
    updateCanvasSize();

    function scaleCoords(coords) {
        const coordsArray = coords.split(',').map(Number);
        const scaledCoords = coordsArray.map((coord, index) => {
            return index % 2 === 0 
                ? coord * canvas.scaleX 
                : coord * canvas.scaleY;
        });
        return scaledCoords;
    }

    function highlightArea(coords) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        
        const scaledCoords = scaleCoords(coords);
        ctx.moveTo(scaledCoords[0], scaledCoords[1]);
        
        for(let i = 2; i < scaledCoords.length; i += 2) {
            ctx.lineTo(scaledCoords[i], scaledCoords[i + 1]);
        }
        
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 152, 0, 0.4)';
        ctx.fill();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    provinces.hanoi_districts.forEach(district => {
        if (!district.coords) return;

        const area = document.createElement('area');
        area.shape = 'poly';
        area.coords = district.coords;
        area.href = '#';
        area.dataset.id = district.id;
        map.appendChild(area);

        // Thêm event listener cho click
        area.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Clear previous highlight
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            highlightArea(this.coords);
            
            const district = provinces.hanoi_districts.find(d => d.id === parseInt(this.dataset.id));
            if (district) {
                showTooltip(district);
            }
        });
    });

    // Clear highlight và đóng tooltip khi click outside
    document.addEventListener('click', function(e) {
        const tooltip = document.querySelector('.tooltip-box');
        const area = e.target.closest('area');
        if (!tooltip.contains(e.target) && !area) {
            tooltip.style.display = 'none';
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
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
        e.stopPropagation();
    }, { passive: true });

    tooltip.style.display = 'block';
}

// Thêm xử lý cho touch events
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