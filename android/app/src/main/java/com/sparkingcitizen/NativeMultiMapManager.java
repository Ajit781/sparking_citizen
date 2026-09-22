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
import com.google.android.gms.maps.model.Marker;
import com.google.android.gms.maps.model.MarkerOptions;

import java.util.Map;
import java.util.HashMap;

public class NativeMultiMapManager extends SimpleViewManager<MapView> {
    public static final String REACT_CLASS = "NativeMultiMap";

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
                googleMap.setOnMarkerClickListener(new GoogleMap.OnMarkerClickListener() {
                    @Override
                    public boolean onMarkerClick(Marker marker) {
                        String id = (String) marker.getTag();
                        if (id != null) {
                            WritableMap event = Arguments.createMap();
                            event.putString("id", id);
                            ReactContext reactContext = (ReactContext) mapView.getContext();
                            reactContext.getJSModule(RCTEventEmitter.class).receiveEvent(
                                    mapView.getId(),
                                    "onMarkerPress",
                                    event);
                        }
                        return false;
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
            
            // Extract optional zoom from region, default to 13.5f for a wider view
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

    private android.graphics.Bitmap createCustomMarker(android.content.Context context, boolean isSelected) {
        int size = 50;
        android.graphics.Bitmap bitmap = android.graphics.Bitmap.createBitmap(size, size, android.graphics.Bitmap.Config.ARGB_8888);
        android.graphics.Canvas canvas = new android.graphics.Canvas(bitmap);
        
        android.graphics.Paint paint = new android.graphics.Paint();
        paint.setAntiAlias(true);
        
        // Theme color: Saffron / Orange (#F57C00) for normal, Blue for selected
        paint.setColor(android.graphics.Color.parseColor(isSelected ? "#2196F3" : "#F57C00"));
        
        // Draw circular background
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint);
        
        // Draw white border
        paint.setColor(android.graphics.Color.WHITE);
        paint.setStyle(android.graphics.Paint.Style.STROKE);
        paint.setStrokeWidth(2.5f);
        canvas.drawCircle(size / 2f, size / 2f, (size / 2f) - 1.5f, paint);
        
        // Draw 'P'
        paint.setStyle(android.graphics.Paint.Style.FILL);
        paint.setTextSize(26f);
        paint.setFakeBoldText(true);
        paint.setTextAlign(android.graphics.Paint.Align.CENTER);
        
        // Vertically center text
        android.graphics.Rect textBounds = new android.graphics.Rect();
        paint.getTextBounds("P", 0, 1, textBounds);
        float yPos = (size / 2f) - textBounds.exactCenterY();
        
        canvas.drawText("P", size / 2f, yPos, paint);
        
        return bitmap;
    }

    @ReactProp(name = "markers")
    public void setMarkers(MapView view, ReadableArray markers) {
        view.getMapAsync(new OnMapReadyCallback() {
            @Override
            public void onMapReady(GoogleMap googleMap) {
                googleMap.clear();

                if (markers == null) return;

                com.google.android.gms.maps.model.LatLngBounds.Builder builder = new com.google.android.gms.maps.model.LatLngBounds.Builder();
                boolean hasMarkers = false;

                for (int i = 0; i < markers.size(); i++) {
                    ReadableMap m = markers.getMap(i);
                    double lat = m.getDouble("latitude");
                    double lng = m.getDouble("longitude");
                    String id = m.getString("id");
                    String title = m.hasKey("title") ? m.getString("title") : "";
                    String color = m.hasKey("color") ? m.getString("color") : "red";

                    boolean isSelected = "blue".equals(color);
                    
                    android.graphics.Bitmap customIcon = createCustomMarker(view.getContext(), isSelected);

                    LatLng pos = new LatLng(lat, lng);
                    Marker marker = googleMap.addMarker(new MarkerOptions()
                            .position(pos)
                            .title(title)
                            .icon(BitmapDescriptorFactory.fromBitmap(customIcon))
                            .zIndex(isSelected ? 100 : 0));
                    
                    marker.setTag(id);
                    builder.include(pos);
                    hasMarkers = true;
                }

                if (hasMarkers) {
                    try {
                        if (view.getTag() == null) {
                            view.setTag("centered");
                            googleMap.animateCamera(CameraUpdateFactory.newLatLngBounds(builder.build(), 100));
                        }
                    } catch (Exception e) {
                        // In case layout hasn't happened yet, catch the exception
                    }
                }
            }
        });
    }
}
