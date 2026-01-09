<template>
  <div class="h-full w-full flex flex-col gap-2">
    <!-- Mode Tabs -->
    <NTabs type="segment" :value="currentMode" @update:value="switchMode">
      <NTabPane name="district" tab="行政区域 (自动)" />
      <NTabPane name="circle" tab="圆形范围 (半径)" />
      <NTabPane name="polygon" tab="自定义绘制 (手绘)" />
    </NTabs>

    <!-- Controls Area -->
    <div class="flex flex-col gap-2 p-2 bg-gray-50 rounded border border-gray-100 min-h-[60px] flex-shrink-0 justify-center">
      
      <!-- District Mode Controls -->
      <div v-if="currentMode === 'district'" class="flex gap-2 items-center">
        <RegionCascader class="flex-1" @update:label="handleRegionLabelUpdate" @update:value="handleRegionValueUpdate" />
        <NButton type="primary" size="small" :disabled="!pendingRegionLabels || pendingRegionLabels.length === 0" @click="applyRegionSelection">确定</NButton>
      </div>

      <!-- Circle Mode Controls -->
      <div v-if="currentMode === 'circle'" class="flex gap-4 items-center">
        <div class="flex items-center gap-2 flex-1">
          <span>半径(公里):</span>
          <NSlider v-model:value="circleRadiusKm" :min="0.5" :max="50" :step="0.5" class="flex-1" @update:value="updateCircle" />
          <NInputNumber v-model:value="circleRadiusKm" size="small" :min="0.1" class="w-20" :show-button="false" @update:value="updateCircle" />
        </div>
        <div class="text-xs text-gray-400">请点击地图设定中心点</div>
      </div>

      <!-- Polygon Mode Controls -->
      <div v-if="currentMode === 'polygon'" class="flex gap-2">
         <NButton v-if="!isDrawing" type="primary" size="small" @click="startDraw">开始绘制</NButton>
         <NButton v-else type="error" size="small" @click="endDraw">结束/确认绘制</NButton>
         <NButton size="small" @click="() => clearFence()">清除围栏</NButton>
      </div>
      
      <!-- Common Search -->
      <div class="flex gap-2" v-if="currentMode !== 'district'">
         <NInput v-model:value="searchKeyword" placeholder="搜索地点 (例如: 长沙市政府)" @keypress.enter="searchPlace" />
         <NButton type="primary" @click="searchPlace">搜索</NButton>
      </div>

    </div>

    <!-- Map Container -->
    <div id="amap-container" class="flex-1 rounded border border-gray-200 min-h-400px relative">
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
        <NSpin description="地图资源加载中..." />
      </div>
    </div>
    
    <!-- Status Footer -->
    <div class="text-xs text-gray-500 flex justify-between">
      <span>当前地址: {{ currentAddress || '未选择' }}</span>
      <span v-if="hasFence" class="text-green-600 font-bold">✓ 已生成有效围栏数据</span>
      <span v-else class="text-red-400">⚠ 未生成围栏</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import AMapLoader from '@amap/amap-jsapi-loader';
import RegionCascader from './RegionCascader.vue';

interface Point {
  lat: number;
  lng: number;
}

interface Props {
  modelValue?: Point;
  address?: string;
  fence?: any; // GeoJSON Polygon or MultiPolygon
}

const props = defineProps<Props>();
const emit = defineEmits(['update:modelValue', 'update:address', 'update:fence']);

// State
const loading = ref(true);
const currentMode = ref('district'); // district | circle | polygon
const searchKeyword = ref('');
const currentAddress = ref(props.address || '');
const currentPoint = ref<Point | undefined>(props.modelValue);
const hasFence = ref(false);

// AMap Objects
let map: any = null;
let marker: any = null;
let AMapObj: any = null;
let districtSearch: any = null;
let polygonEditor: any = null;
let circleEditor: any = null;
let placeSearch: any = null;
let geocoder: any = null;

// Overlays
let currentPolygons: any[] = []; // Array of AMap.Polygon
let currentCircle: any = null; // AMap.Circle

// Circle Mode Data
const circleRadiusKm = ref(3);

// Polygon Mode Data
const isDrawing = ref(false);

// --- Initialization ---
async function initMap() {
  try {
    (window as any)._AMapSecurityConfig = {
      securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE,
    };

    AMapObj = await AMapLoader.load({
      key: import.meta.env.VITE_AMAP_KEY,
      version: '2.0',
      plugins: ['AMap.Geocoder', 'AMap.AutoComplete', 'AMap.PlaceSearch', 'AMap.PolygonEditor', 'AMap.CircleEditor', 'AMap.DistrictSearch', 'AMap.GeometryUtil'],
    });

    map = new AMapObj.Map('amap-container', {
      zoom: 12,
      center: props.modelValue ? [props.modelValue.lng, props.modelValue.lat] : [112.9388, 28.2282],
      resizeEnable: true,
      scrollWheel: true, // Allow zooming
    });

    // Plugins
    geocoder = new AMapObj.Geocoder();
    // Prevent auto-marker generation by PlaceSearch
    placeSearch = new AMapObj.PlaceSearch({});
    
    // Init District Search
    districtSearch = new AMapObj.DistrictSearch({
        subdistrict: 1,   // Return next level districts
        extensions: 'all', // Return boundaries -> Critical!
        level: 'province'
    });

    // Map Click Handler
    map.on('click', (e: any) => {
        handleMapClick(e.lnglat.getLat(), e.lnglat.getLng());
    });

    // Initial Data
    if (props.modelValue) {
      addMarker(props.modelValue.lat, props.modelValue.lng);
    }
    
    // Initial Fence Render
    if (props.fence && props.fence.coordinates) {
        if (props.fence.type === 'MultiPolygon') {
             const boundaries = props.fence.coordinates.map((poly: any) => poly[0]);
             drawRegionBoundary(boundaries);
        } else {
             // Default to Polygon (use first ring)
             drawPolygonOnMap(props.fence.coordinates[0]);
        }
        hasFence.value = true;
    }

    loading.value = false;
  } catch (e) {
    console.error('Map Load Failed', e);
    loading.value = false;
  }
}

// --- Mode Switching ---
function switchMode(val: string) {
    currentMode.value = val;
    
    // Clean up drawing state
    if (isDrawing.value) endDraw();
    
    // Cleanup Circle Editor if leaving circle mode
    if (circleEditor) {
        circleEditor.close();
        circleEditor = null;
    }
    
    // Mode specific cleanup/setup
    if (val === 'circle') {
        // If we have a point, render circle immediately
        if (currentPoint.value) {
            clearFence(false); // Clear existing polygons but don't emit null yet
            updateCircle();
        } else {
            clearFence(); // Clear everything
        }
    } else if (val === 'district') {
         // Clear manual drawings
         // clearFence(); 
         if (currentCircle) { // Clear circle visual if moving to district
            map.remove(currentCircle);
            currentCircle = null;
         }
    } else if (val === 'polygon') {
         // Clear circle if exists
         if (currentCircle) {
             map.remove(currentCircle);
             currentCircle = null;
         }
    }
}

// --- Map Interaction ---
function handleMapClick(lat: number, lng: number) {
    if (currentMode.value === 'polygon' && isDrawing.value) {
        return; // Editor handles clicks
    }

    // Set Center Point
    selectPoint(lat, lng);

    if (currentMode.value === 'circle') {
        updateCircle(); // Re-draw circle at new center
    }
}

function selectPoint(lat: number, lng: number) {
  // Ensure coordinates are numbers to prevent math errors (especially from Search results)
  const safeLat = Number(lat);
  const safeLng = Number(lng);
  
  currentPoint.value = { lat: safeLat, lng: safeLng };
  emit('update:modelValue', currentPoint.value);
  addMarker(safeLat, safeLng);
  
  geocoder.getAddress([safeLng, safeLat], (status: string, result: any) => {
    if (status === 'complete' && result.regeocode) {
      currentAddress.value = result.regeocode.formattedAddress;
      emit('update:address', currentAddress.value);
    }
  });
}

function addMarker(lat: number, lng: number) {
  if (marker) map.remove(marker);
  marker = new AMapObj.Marker({
    position: [lng, lat],
    anchor: 'bottom-center'
  });
  marker.setMap(map);
  map.setCenter([lng, lat]);
}

function searchPlace() {
  if (!searchKeyword.value || !placeSearch) return;
  placeSearch.search(searchKeyword.value, (status: string, result: any) => {
    if (status === 'complete' && result.poiList && result.poiList.pois && result.poiList.pois.length > 0) {
      const poi = result.poiList.pois[0];
      selectPoint(poi.location.lat, poi.location.lng);
      if (currentMode.value === 'circle') updateCircle();
    }
  });
}

// --- District Mode Logic ---
const pendingRegionLabels = ref<string[]>([]);
const pendingRegionCode = ref<string | null>(null);

function handleRegionLabelUpdate(labels: string[]) {
    pendingRegionLabels.value = labels;
}

function handleRegionValueUpdate(val: string) {
    pendingRegionCode.value = val;
}

function applyRegionSelection() {
    const labels = pendingRegionLabels.value;
    if (!labels || labels.length === 0) return;
    
    // Use adcode if available, otherwise fallback to name
    const keyword = pendingRegionCode.value || labels[labels.length - 1]; 
    const levelMap = ['country', 'province', 'city', 'district'];
    const level = levelMap[labels.length] || 'district';

    if (districtSearch) {
        districtSearch.setLevel(level); 
        districtSearch.search(keyword, (status: string, result: any) => {
            if (status === 'complete' && result.districtList && result.districtList.length > 0) {
                 const item = result.districtList[0];
                 
                 // Ensure center and zoom are correct
                 if(item.center && map) {
                     map.setCenter(item.center);
                     if (level === 'province') map.setZoom(8);
                     else if (level === 'city') map.setZoom(10);
                     else map.setZoom(13);
                 }

                 // Draw boundaries
                 if(item.boundaries && item.boundaries.length > 0) {
                     drawRegionBoundary(item.boundaries);
                 } else {
                     // Fallback if no boundaries found (rare but possible) or backend didn't return them
                     console.warn('No boundaries found for region:', keyword);
                 }
                 
                 currentAddress.value = labels.join('');
                 emit('update:address', currentAddress.value);
            }
        });
    }
}


// --- Circle Mode Logic ---
function updateCircle() {
    if (!currentPoint.value || !AMapObj || !map) return;
    
    // Clear previous circle (if re-creating)
    if (currentCircle) {
        // If we already have a circle and editor, just update radius/center
         if (circleEditor) {
             // Let the editor handling logic manage updates if it was user interaction
             // But if this call comes from Input/Slider, we need to update the circle
         } else {
            map.remove(currentCircle);
            currentCircle = null;
         }
    }
    
    // Clear polygons (visual only, we will regen data)
    if (currentPolygons.length > 0) {
        currentPolygons.forEach(p => map.remove(p));
        currentPolygons = [];
    }

    const center = [currentPoint.value.lng, currentPoint.value.lat];
    const radiusMeters = circleRadiusKm.value * 1000;
    
    // 1. Draw Visual Circle (Visual)
    if (!currentCircle) {
        currentCircle = new AMapObj.Circle({
            center: center,
            radius: radiusMeters,
            strokeColor: "#FF33FF",
            strokeWeight: 2,
            fillColor: "#1791fc",
            fillOpacity: 0.35,
            map: map,
            strokeStyle: 'dashed',
            strokeDasharray: [10, 10], 
        });
    } else {
        currentCircle.setCenter(center);
        currentCircle.setRadius(radiusMeters);
    }
    
    // Setup Editor
    if (!circleEditor) {
        circleEditor = new AMapObj.CircleEditor(map, currentCircle);
        
        circleEditor.on('adjust', (event: any) => {
            const r = event.radius;
            circleRadiusKm.value = Number((r / 1000).toFixed(2));
            generateCircleGeoJson(); // Sync data
        });

        circleEditor.on('move', (event: any) => {
             const lnglat = event.lnglat;
             selectPoint(lnglat.lat, lnglat.lng);
             // selectPoint calls updateCircle, effectively syncing everything, 
             // but we should avoid infinite loops if it calls updateCircle back.
             // Actually selectPoint -> updateCircle -> setCenter. 
             // We might want to just update marker without full re-draw to be smoother?
             // For now, let's trust the flow.
        });
        
        circleEditor.open();
    }

    generateCircleGeoJson();
    
    // Fit view only if we just created it or significant shift? 
    // Constantly fitting view might be annoying during editing.
    // map.setFitView([currentCircle]);
}

function generateCircleGeoJson() {
    if (!currentCircle || !currentPoint.value) return;
    
    const center = [currentPoint.value.lng, currentPoint.value.lat];
    const radiusMeters = currentCircle.getRadius();
    
    const path = [];
    const numPoints = 64; 
    for (let i = 0; i < numPoints; i++) {
        const angle = (2 * Math.PI * i) / numPoints;
        const dx = radiusMeters * Math.cos(angle);
        const dy = radiusMeters * Math.sin(angle);
        
        const lng = center[0] + dx / (111319.55 * Math.cos(center[1] * Math.PI / 180));
        const lat = center[1] + dy / 111319.55;
        path.push([lng, lat]);
    }
    path.push(path[0]);
    
    const geoJson = { type: 'Polygon', coordinates: [path] };
    emit('update:fence', geoJson);
    hasFence.value = true;
}

// --- Polygon Mode Logic ---
function startDraw() {
    // Clear everything
    if (currentCircle) {
        map.remove(currentCircle);
        currentCircle = null;
    }
    clearFence(); // Start fresh
    
    if (!polygonEditor) {
         // Create a new fresh polygon for editing
         const polygon = new AMapObj.Polygon({
           map: map,
           path: [],
           strokeColor: "#FF33FF",
           fillColor: "#1791fc",
           fillOpacity: 0.35
       });
       polygonEditor = new AMapObj.PolygonEditor(map, polygon); 
       currentPolygons = [polygon];
       
       polygonEditor.on('end', () => syncPolygonData());
       polygonEditor.on('adjust', () => syncPolygonData());
    } else {
        // If reuse, ensure we have a valid target
        const polygon = new AMapObj.Polygon({
           map: map,
           path: [],
           strokeColor: "#FF33FF",
           fillColor: "#1791fc",
           fillOpacity: 0.35
       });
       polygonEditor.setTarget(polygon);
       currentPolygons = [polygon];
    }

    isDrawing.value = true;
    polygonEditor.open();
}

function endDraw() {
    if(polygonEditor) {
        polygonEditor.close();
        isDrawing.value = false;
        syncPolygonData();
    }
}

// --- Data Sync Helpers ---

// Draw a single polygon path
function drawPolygonOnMap(path: any[]) {
    clearFence();
    // Remove circle if exists
    if (currentCircle) {
        map.remove(currentCircle);
        currentCircle = null;
    }

    const polygon = new AMapObj.Polygon({
           map: map,
           path: path,
           strokeColor: "#FF33FF", 
           strokeWeight: 2,
           fillColor: "#1791fc",
           fillOpacity: 0.35
    });
    currentPolygons = [polygon];
    map.setFitView(currentPolygons);
    syncPolygonData();
}

// Draw multiple paths (MultiPolygon or Region)
function drawRegionBoundary(boundaries: any[]) {
    // Clear existing visuals
    if (currentPolygons.length > 0) {
        currentPolygons.forEach(p => map.remove(p));
        currentPolygons = [];
    }
    if (currentCircle) {
        map.remove(currentCircle);
        currentCircle = null;
    }

    const newPolygons = [];
    for (let i = 0; i < boundaries.length; i++) {
        var polygon = new AMapObj.Polygon({
          map: map,
          strokeWeight: 1,
          path: boundaries[i],
          fillOpacity: 0.35,
          fillColor: "#1791fc",
          strokeColor: "#FF33FF",
        });
        newPolygons.push(polygon);
    }
    currentPolygons = newPolygons;
    
    // Ensure sync even if we just drew them (so we emit the data)
    if (currentPolygons.length > 0) {
        map.setFitView(currentPolygons);
    }
    syncPolygonData();
}

function clearFence(emitUpdate = true) {
    if (currentPolygons.length > 0) {
        currentPolygons.forEach(p => map.remove(p));
        currentPolygons = [];
    }
    // Also clear circle
     if (currentCircle) {
        map.remove(currentCircle);
        currentCircle = null;
    }
    if (circleEditor) {
        circleEditor.close();
        circleEditor = null;
    }
    
    if (polygonEditor) {
        polygonEditor.close();
        polygonEditor.setTarget(null);
    }
    
    if (emitUpdate) {
        hasFence.value = false;
        emit('update:fence', null);
    }
}

function syncPolygonData() {
    // Filter out invalid polygons (e.g. empty ones from editor initiation)
    const validPolys = currentPolygons.filter(p => {
        const path = p.getPath();
        return path && path.length >= 3;
    });

    if (validPolys.length === 0) {
         hasFence.value = false;
         // emit('update:fence', null); // Optional: Do we want to clear if user draws nothing? Yes.
         return;
    }

    const allCoordinates = [];
    
    for (const poly of validPolys) {
         const path = poly.getPath();
         const ring = path.map((bg: any) => [bg.lng, bg.lat]);
         // Ensure closed ring
         if (ring[0][0] !== ring[ring.length-1][0] || ring[0][1] !== ring[ring.length-1][1]) {
            ring.push(ring[0]);
         }
         allCoordinates.push([ring]);
    }
    
    if (allCoordinates.length > 0) {
         let geoJson;
         if (allCoordinates.length === 1) {
             geoJson = { type: 'Polygon', coordinates: allCoordinates[0] };
         } else {
             geoJson = { type: 'MultiPolygon', coordinates: allCoordinates };
         }
         emit('update:fence', geoJson);
         hasFence.value = true;
    }
}

onMounted(() => {
  initMap();
});

onUnmounted(() => {
  if (map) {
    map.destroy();
  }
});
</script>

<style scoped>
#amap-container {
  width: 100%;
  height: 100%;
  touch-action: none;
}
</style>