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
        MapView mapView = new MapView(reactContext) {
            @Override
            public boolean dispatchTouchEvent(android.view.MotionEvent ev) {
                // Prevent React Native ScrollView from stealing map pan/zoom gestures
                getParent().requestDisallowInterceptTouchEvent(true);
                return super.dispatchTouchEvent(ev);
            }
        };
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

                // 1. Parking Marker
                googleMap.addMarker(new MarkerOptions()
                        .position(lotLocation)
                        .title("Parking Area")
                        .icon(BitmapDescriptorFactory.fromBitmap(createCustomMarker(view.getContext()))));

                if (mUserCoordinates != null && mUserCoordinates.hasKey("latitude") && mUserCoordinates.hasKey("longitude")) {
                    double userLat = mUserCoordinates.getDouble("latitude");
                    double userLng = mUserCoordinates.getDouble("longitude");
                    LatLng userLocation = new LatLng(userLat, userLng);

                    // 2. User Marker
                    googleMap.addMarker(new MarkerOptions()
                            .position(userLocation)
                            .title("Your Location")
                            .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_ORANGE)));

                    // 3. Fetch Directions in Background
                    fetchAndDrawRoute(googleMap, userLocation, lotLocation);
                } else {
                    googleMap.moveCamera(CameraUpdateFactory.newLatLngZoom(lotLocation, 16f));
                }
            }
        });
    }

    private void fetchAndDrawRoute(final GoogleMap googleMap, final LatLng origin, final LatLng dest) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    // Use free OSRM API instead of Google Directions (to bypass Android-only API key restrictions)
                    String urlString = "https://router.project-osrm.org/route/v1/driving/" +
                            origin.longitude + "," + origin.latitude + ";" +
                            dest.longitude + "," + dest.latitude + "?overview=full&geometries=polyline";

                    java.net.URL url = new java.net.URL(urlString);
                    java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setRequestProperty("User-Agent", "SParkingCitizenAndroidApp/1.0");
                    conn.setConnectTimeout(5000);
                    conn.setReadTimeout(5000);
                    java.io.InputStream in = new java.io.BufferedInputStream(conn.getInputStream());
                    java.util.Scanner scanner = new java.util.Scanner(in).useDelimiter("\\A");
                    String response = scanner.hasNext() ? scanner.next() : "";
                    
                    org.json.JSONObject jsonObject = new org.json.JSONObject(response);
                    
                    if (jsonObject.has("routes") && jsonObject.getJSONArray("routes").length() > 0) {
                        String polyline = jsonObject.getJSONArray("routes").getJSONObject(0).getString("geometry");
                        final java.util.List<LatLng> decodedPath = decodePoly(polyline);
                        
                        new android.os.Handler(android.os.Looper.getMainLooper()).post(new Runnable() {
                            @Override
                            public void run() {
                                // Draw Outline (Thinner, Deep Orange)
                                com.google.android.gms.maps.model.PolylineOptions outlineOptions = new com.google.android.gms.maps.model.PolylineOptions()
                                        .addAll(decodedPath)
                                        .width(16f)
                                        .color(android.graphics.Color.parseColor("#E65100"))
                                        .jointType(com.google.android.gms.maps.model.JointType.ROUND)
                                        .startCap(new com.google.android.gms.maps.model.RoundCap())
                                        .endCap(new com.google.android.gms.maps.model.RoundCap());
                                googleMap.addPolyline(outlineOptions);

                                // Draw Inner Line (Brighter Saffron)
                                com.google.android.gms.maps.model.PolylineOptions innerOptions = new com.google.android.gms.maps.model.PolylineOptions()
                                        .addAll(decodedPath)
                                        .width(10f)
                                        .color(android.graphics.Color.parseColor("#FF9800"))
                                        .jointType(com.google.android.gms.maps.model.JointType.ROUND)
                                        .startCap(new com.google.android.gms.maps.model.RoundCap())
                                        .endCap(new com.google.android.gms.maps.model.RoundCap());
                                googleMap.addPolyline(innerOptions);

                                com.google.android.gms.maps.model.LatLngBounds.Builder builder = new com.google.android.gms.maps.model.LatLngBounds.Builder();
                                for (LatLng point : decodedPath) {
                                    builder.include(point);
                                }
                                googleMap.moveCamera(CameraUpdateFactory.newLatLngBounds(builder.build(), 100));
                            }
                        });
                    } else {
                        drawFallbackLine(googleMap, origin, dest);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                    drawFallbackLine(googleMap, origin, dest);
                }
            }
        }).start();
    }

    private void drawFallbackLine(final GoogleMap googleMap, final LatLng origin, final LatLng dest) {
        new android.os.Handler(android.os.Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                // Draw Outline (Thinner, Deep Orange)
                com.google.android.gms.maps.model.PolylineOptions outlineOptions = new com.google.android.gms.maps.model.PolylineOptions()
                        .add(origin, dest)
                        .width(16f)
                        .color(android.graphics.Color.parseColor("#E65100"))
                        .jointType(com.google.android.gms.maps.model.JointType.ROUND)
                        .startCap(new com.google.android.gms.maps.model.RoundCap())
                        .endCap(new com.google.android.gms.maps.model.RoundCap());
                googleMap.addPolyline(outlineOptions);

                // Draw Inner Line (Brighter Saffron)
                com.google.android.gms.maps.model.PolylineOptions innerOptions = new com.google.android.gms.maps.model.PolylineOptions()
                        .add(origin, dest)
                        .width(10f)
                        .color(android.graphics.Color.parseColor("#FF9800"))
                        .jointType(com.google.android.gms.maps.model.JointType.ROUND)
                        .startCap(new com.google.android.gms.maps.model.RoundCap())
                        .endCap(new com.google.android.gms.maps.model.RoundCap());
                googleMap.addPolyline(innerOptions);

                com.google.android.gms.maps.model.LatLngBounds bounds = new com.google.android.gms.maps.model.LatLngBounds.Builder()
                        .include(origin)
                        .include(dest)
                        .build();
                googleMap.moveCamera(CameraUpdateFactory.newLatLngBounds(bounds, 100));
            }
        });
    }

    private java.util.List<LatLng> decodePoly(String encoded) {
        java.util.List<LatLng> poly = new java.util.ArrayList<>();
        int index = 0, len = encoded.length();
        int lat = 0, lng = 0;

        while (index < len) {
            int b, shift = 0, result = 0;
            do {
                b = encoded.charAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            poly.add(new LatLng((double) lat / 1E5, (double) lng / 1E5));
        }

        return poly;
    }
}
