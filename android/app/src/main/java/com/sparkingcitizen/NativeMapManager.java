package com.sparkingcitizen;

import androidx.annotation.NonNull;

import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.facebook.react.bridge.ReadableMap;

import com.google.android.gms.maps.CameraUpdateFactory;
import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.MapView;
import com.google.android.gms.maps.OnMapReadyCallback;
import com.google.android.gms.maps.model.BitmapDescriptorFactory;
import com.google.android.gms.maps.model.LatLng;
import com.google.android.gms.maps.model.MarkerOptions;

public class NativeMapManager extends SimpleViewManager<MapView> {
    public static final String REACT_CLASS = "NativeMap";

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
        mapView.onResume(); // Force map to load since we aren't hooking into Activity lifecycle deeply
        return mapView;
    }

    private ReadableMap mLotCoordinates;
    private ReadableMap mUserCoordinates;

    @ReactProp(name = "coordinates")
    public void setCoordinates(MapView view, ReadableMap coordinates) {
        mLotCoordinates = coordinates;
        updateMap(view);
    }

    @ReactProp(name = "userCoordinates")
    public void setUserCoordinates(MapView view, ReadableMap coordinates) {
        mUserCoordinates = coordinates;
        updateMap(view);
    }

    private android.graphics.Bitmap createCustomMarker(android.content.Context context) {
        int size = 50;
        android.graphics.Bitmap bitmap = android.graphics.Bitmap.createBitmap(size, size, android.graphics.Bitmap.Config.ARGB_8888);
        android.graphics.Canvas canvas = new android.graphics.Canvas(bitmap);
        android.graphics.Paint paint = new android.graphics.Paint();
        paint.setAntiAlias(true);
        // Saffron / Orange (#F57C00)
        paint.setColor(android.graphics.Color.parseColor("#F57C00"));
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint);
        // White border
        paint.setColor(android.graphics.Color.WHITE);
        paint.setStyle(android.graphics.Paint.Style.STROKE);
        paint.setStrokeWidth(2.5f);
        canvas.drawCircle(size / 2f, size / 2f, (size / 2f) - 1.5f, paint);
        // Draw 'P'
        paint.setStyle(android.graphics.Paint.Style.FILL);
        paint.setTextSize(25f);
        paint.setFakeBoldText(true);
        paint.setTextAlign(android.graphics.Paint.Align.CENTER);
        android.graphics.Rect textBounds = new android.graphics.Rect();
        paint.getTextBounds("P", 0, 1, textBounds);
        float yPos = (size / 2f) - textBounds.exactCenterY();
        canvas.drawText("P", size / 2f, yPos, paint);
        return bitmap;
    }

    private void updateMap(MapView view) {
        if (mLotCoordinates == null) return;

        double lotLat = mLotCoordinates.getDouble("latitude");
        double lotLng = mLotCoordinates.getDouble("longitude");

        view.getMapAsync(new OnMapReadyCallback() {
            @Override
            public void onMapReady(GoogleMap googleMap) {
                LatLng lotLocation = new LatLng(lotLat, lotLng);
                googleMap.clear();

                // 1. Parking Marker (Custom P Saffron)
                googleMap.addMarker(new MarkerOptions()
                        .position(lotLocation)
                        .title("Parking Area")
                        .icon(BitmapDescriptorFactory.fromBitmap(createCustomMarker(view.getContext()))));

                if (mUserCoordinates != null && mUserCoordinates.hasKey("latitude") && mUserCoordinates.hasKey("longitude")) {
                    double userLat = mUserCoordinates.getDouble("latitude");
                    double userLng = mUserCoordinates.getDouble("longitude");
                    LatLng userLocation = new LatLng(userLat, userLng);

                    // 2. User Marker (Theme-colored)
                    googleMap.addMarker(new MarkerOptions()
                            .position(userLocation)
                            .title("Your Location")
                            .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_ORANGE)));

                    // 3. Draw a Line (Polyline) — Theme Saffron color
                    com.google.android.gms.maps.model.PolylineOptions lineOptions = new com.google.android.gms.maps.model.PolylineOptions()
                            .add(userLocation, lotLocation)
                            .width(10f)
                            .color(android.graphics.Color.parseColor("#F57C00"));
                    googleMap.addPolyline(lineOptions);

                    // 4. Zoom to fit both
                    com.google.android.gms.maps.model.LatLngBounds bounds = new com.google.android.gms.maps.model.LatLngBounds.Builder()
                            .include(userLocation)
                            .include(lotLocation)
                            .build();
                    
                    // Use padding of 100 pixels
                    googleMap.moveCamera(CameraUpdateFactory.newLatLngBounds(bounds, 100));
                } else {
                    // Only Lot available
                    googleMap.moveCamera(CameraUpdateFactory.newLatLngZoom(lotLocation, 16f));
                }
            }
        });
    }
}
