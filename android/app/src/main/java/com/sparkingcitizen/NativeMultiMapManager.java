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
import com.google.android.gms.maps.model.LatLng;
import com.google.android.gms.maps.model.LatLngBounds;
import com.google.maps.android.clustering.ClusterManager;
import com.google.maps.android.clustering.Cluster;

import java.util.Map;

public class NativeMultiMapManager extends SimpleViewManager<MapView> {
    public static final String REACT_CLASS = "NativeMultiMap";
    private ClusterManager<ParkingClusterItem> mClusterManager;

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
        mapView.onResume(); // Force map to load

        mapView.getMapAsync(new OnMapReadyCallback() {
            @Override
            public void onMapReady(GoogleMap googleMap) {
                // Initialize the manager with the context and the map.
                mClusterManager = new ClusterManager<>(reactContext, googleMap);
                
                // Set the custom renderer
                mClusterManager.setRenderer(new ParkingClusterRenderer(reactContext, googleMap, mClusterManager));

                // Point the map's listeners at the listeners implemented by the cluster manager.
                googleMap.setOnCameraIdleListener(mClusterManager);
                googleMap.setOnMarkerClickListener(mClusterManager);
                
                // Add click listener for individual clustered items
                mClusterManager.setOnClusterItemClickListener(new ClusterManager.OnClusterItemClickListener<ParkingClusterItem>() {
                    @Override
                    public boolean onClusterItemClick(ParkingClusterItem item) {
                        WritableMap event = Arguments.createMap();
                        event.putString("id", item.getId());
                        ReactContext reactContext = (ReactContext) mapView.getContext();
                        reactContext.getJSModule(RCTEventEmitter.class).receiveEvent(
                                mapView.getId(),
                                "onMarkerPress",
                                event);
                        return false;
                    }
                });
                
                // Add click listener for clusters to zoom in
                mClusterManager.setOnClusterClickListener(new ClusterManager.OnClusterClickListener<ParkingClusterItem>() {
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
        return com.facebook.react.common.MapBuilder.of(
            "onMarkerPress",
            com.facebook.react.common.MapBuilder.of("registrationName", "onMarkerPress")
        );
    }

    @ReactProp(name = "region")
    public void setRegion(MapView view, ReadableMap region) {
        if (region != null && region.hasKey("latitude") && region.hasKey("longitude")) {
            double lat = region.getDouble("latitude");
            double lng = region.getDouble("longitude");
            
            final float zoomLevel = region.hasKey("zoom") ? (float) region.getDouble("zoom") : 13.5f;

            view.getMapAsync(new OnMapReadyCallback() {
                @Override
                public void onMapReady(GoogleMap googleMap) {
                    LatLng location = new LatLng(lat, lng);
                    googleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(location, zoomLevel));
                }
            });
        }
    }

    @ReactProp(name = "markers")
    public void setMarkers(MapView view, ReadableArray markers) {
        view.getMapAsync(new OnMapReadyCallback() {
            @Override
            public void onMapReady(GoogleMap googleMap) {
                if (mClusterManager == null) return;
                
                mClusterManager.clearItems();

                if (markers == null) {
                    mClusterManager.cluster();
                    return;
                }

                LatLngBounds.Builder builder = new LatLngBounds.Builder();
                boolean hasMarkers = false;

                for (int i = 0; i < markers.size(); i++) {
                    ReadableMap m = markers.getMap(i);
                    double lat = m.getDouble("latitude");
                    double lng = m.getDouble("longitude");
                    String id = m.getString("id");
                    String title = m.hasKey("title") ? m.getString("title") : "";
                    String color = m.hasKey("color") ? m.getString("color") : "red";

                    boolean isSelected = "blue".equals(color);
                    
                    ParkingClusterItem offsetItem = new ParkingClusterItem(lat, lng, title, id, isSelected);
                    mClusterManager.addItem(offsetItem);
                    
                    builder.include(new LatLng(lat, lng));
                    hasMarkers = true;
                }

                mClusterManager.cluster();

                if (hasMarkers) {
                    try {
                        if (view.getTag() == null) {
                            view.setTag("centered");
                            googleMap.animateCamera(CameraUpdateFactory.newLatLngBounds(builder.build(), 100));
                        }
                    } catch (Exception e) {
                        // Ignore
                    }
                }
            }
        });
    }
}
