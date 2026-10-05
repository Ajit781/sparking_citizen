package com.sparkingcitizen;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.facebook.react.uimanager.events.RCTEventEmitter;

import com.google.android.gms.maps.CameraUpdateFactory;
import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.MapView;
import com.google.android.gms.maps.OnMapReadyCallback;
import com.google.android.gms.maps.model.BitmapDescriptorFactory;
import com.google.android.gms.maps.model.LatLng;
import com.google.android.gms.maps.model.LatLngBounds;
import com.google.android.gms.maps.model.Marker;
import com.google.android.gms.maps.model.MarkerOptions;
import com.google.maps.android.clustering.ClusterManager;
import com.google.maps.android.clustering.Cluster;

import java.util.Map;

public class NativeMultiMapManager extends SimpleViewManager<MapView> {
    public static final String REACT_CLASS = "NativeMultiMap";
    private java.util.Map<MapView, ClusterManager<ParkingClusterItem>> mClusterManagers = new java.util.HashMap<>();
    private java.util.Map<MapView, GoogleMap> mGoogleMaps = new java.util.HashMap<>();

    // Tap marker is kept OUTSIDE ClusterManager so it's never clustered and always visible on top
    private java.util.Map<MapView, Marker> mTapMarkers = new java.util.HashMap<>();

    // Pending region state per view
    private java.util.Map<MapView, Double> mPendingLat = new java.util.HashMap<>();
    private java.util.Map<MapView, Double> mPendingLng = new java.util.HashMap<>();
    private java.util.Map<MapView, Float> mPendingZoom = new java.util.HashMap<>();

    @NonNull
    @Override
    public String getName() {
        return REACT_CLASS;
    }

    @NonNull
    @Override
    protected MapView createViewInstance(@NonNull ThemedReactContext reactContext) {
        MapView mapView = new MapView(reactContext);
        mapView.onCreate(null);
        mapView.onResume();

        mapView.getMapAsync(new OnMapReadyCallback() {
            @Override
            public void onMapReady(GoogleMap googleMap) {
                mGoogleMaps.put(mapView, googleMap);

                if (mPendingLat.containsKey(mapView)) {
                    double lat = mPendingLat.remove(mapView);
                    double lng = mPendingLng.remove(mapView);
                    float zoom = mPendingZoom.remove(mapView);
                    googleMap.moveCamera(CameraUpdateFactory.newLatLngZoom(new LatLng(lat, lng), zoom));
                }

                try {
                    googleMap.setMyLocationEnabled(true);
                    googleMap.getUiSettings().setMyLocationButtonEnabled(false);
                } catch (SecurityException e) {
                    e.printStackTrace();
                }

                ClusterManager<ParkingClusterItem> clusterManager = new ClusterManager<>(reactContext, googleMap);
                clusterManager.setRenderer(new ParkingClusterRenderer(reactContext, googleMap, clusterManager));
                mClusterManagers.put(mapView, clusterManager);

                googleMap.setOnCameraIdleListener(clusterManager);
                googleMap.setOnMarkerClickListener(clusterManager);

                clusterManager.setOnClusterItemClickListener(new ClusterManager.OnClusterItemClickListener<ParkingClusterItem>() {
                    @Override
                    public boolean onClusterItemClick(ParkingClusterItem item) {
                        WritableMap event = Arguments.createMap();
                        event.putString("id", item.getId());
                        ReactContext reactContext = (ReactContext) mapView.getContext();
                        reactContext.getJSModule(RCTEventEmitter.class).receiveEvent(
                                mapView.getId(),
                                "onMarkerPress",
                                event);
                        // Return false to let Google Maps automatically animate the camera to the marker
                        return false;
                    }
                });

                googleMap.setOnMapClickListener(new GoogleMap.OnMapClickListener() {
                    @Override
                    public void onMapClick(LatLng point) {
                        WritableMap event = Arguments.createMap();
                        event.putDouble("latitude", point.latitude);
                        event.putDouble("longitude", point.longitude);
                        ReactContext reactContext = (ReactContext) mapView.getContext();
                        reactContext.getJSModule(RCTEventEmitter.class).receiveEvent(
                                mapView.getId(),
                                "onMapPress",
                                event);
                    }
                });

                clusterManager.setOnClusterClickListener(new ClusterManager.OnClusterClickListener<ParkingClusterItem>() {
                    @Override
                    public boolean onClusterClick(Cluster<ParkingClusterItem> cluster) {
                        LatLngBounds.Builder builder = LatLngBounds.builder();
                        for (ParkingClusterItem item : cluster.getItems()) {
                            builder.include(item.getPosition());
                        }
                        try {
                            googleMap.animateCamera(CameraUpdateFactory.newLatLngBounds(builder.build(), 100));
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                        return true;
                    }
                });
            }
        });

        return mapView;
    }

    @Override
    public Map getExportedCustomDirectEventTypeConstants() {
        return com.facebook.react.common.MapBuilder.builder()
            .put("onMarkerPress", com.facebook.react.common.MapBuilder.of("registrationName", "onMarkerPress"))
            .put("onMapPress", com.facebook.react.common.MapBuilder.of("registrationName", "onMapPress"))
            .build();
    }

    private java.util.HashMap<MapView, String> mLastRegionStr = new java.util.HashMap<>();

    @ReactProp(name = "region")
    public void setRegion(MapView view, ReadableMap region) {
        if (region != null && region.hasKey("latitude") && region.hasKey("longitude")) {
            double lat = region.getDouble("latitude");
            double lng = region.getDouble("longitude");
            float zoomLevel = region.hasKey("zoom") ? (float) region.getDouble("zoom") : 14.0f;

            // Prevent React Native re-renders from clobbering map state
            String currentRegionStr = lat + "," + lng + "," + zoomLevel;
            String lastRegionStr = mLastRegionStr.get(view);
            if (currentRegionStr.equals(lastRegionStr)) {
                return; // Ignore if region values haven't changed!
            }
            mLastRegionStr.put(view, currentRegionStr);

            GoogleMap googleMap = mGoogleMaps.get(view);
            if (googleMap != null) {
                // Restore 400ms animation for smooth camera movement (search UI freeze is fixed)
                googleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(new LatLng(lat, lng), zoomLevel), 400, null);
            } else {
                mPendingLat.put(view, lat);
                mPendingLng.put(view, lng);
                mPendingZoom.put(view, zoomLevel);
            }
        }
    }

    @ReactProp(name = "markers")
    public void setMarkers(MapView view, ReadableArray markers) {
        GoogleMap googleMap = mGoogleMaps.get(view);
        ClusterManager<ParkingClusterItem> clusterManager = mClusterManagers.get(view);
        if (googleMap != null && clusterManager != null) {
            applyMarkers(view, googleMap, clusterManager, markers);
        } else {
            view.getMapAsync(new OnMapReadyCallback() {
                @Override
                public void onMapReady(GoogleMap gMap) {
                    ClusterManager<ParkingClusterItem> cm = mClusterManagers.get(view);
                    if (cm != null) {
                        applyMarkers(view, gMap, cm, markers);
                    }
                }
            });
        }
    }

    private void applyMarkers(MapView view, GoogleMap googleMap, ClusterManager<ParkingClusterItem> clusterManager, ReadableArray markers) {
        if (clusterManager == null) return;

        clusterManager.clearItems();

        // Always remove old tap marker first
        Marker oldTapMarker = mTapMarkers.get(view);
        if (oldTapMarker != null) {
            oldTapMarker.remove();
            mTapMarkers.remove(view);
        }

        if (markers == null) {
            clusterManager.cluster();
            return;
        }

        for (int i = 0; i < markers.size(); i++) {
            ReadableMap m = markers.getMap(i);
            double lat = m.getDouble("latitude");
            double lng = m.getDouble("longitude");
            String id = m.getString("id");
            String title = m.hasKey("title") ? m.getString("title") : "";
            String color = m.hasKey("color") ? m.getString("color") : "red";
            boolean isSelected = "blue".equals(color);
            boolean isTap = "__tap_marker__".equals(id);

            if (isTap) {
                // Add tap marker DIRECTLY to GoogleMap — never clusters, always on top
                ParkingClusterRenderer renderer = new ParkingClusterRenderer(
                        view.getContext(), googleMap, clusterManager);
                android.graphics.Bitmap tapBitmap = renderer.createTapMarkerBitmap();
                MarkerOptions opts = new MarkerOptions()
                        .position(new LatLng(lat, lng))
                        .title(title)
                        .zIndex(500) // Always above everything
                        .icon(BitmapDescriptorFactory.fromBitmap(tapBitmap));
                Marker tapMarker = googleMap.addMarker(opts);
                if (tapMarker != null) {
                    mTapMarkers.put(view, tapMarker);
                }
            } else {
                ParkingClusterItem item = new ParkingClusterItem(lat, lng, title, id, isSelected, false);
                clusterManager.addItem(item);
            }
        }

        clusterManager.cluster();
    }

}
