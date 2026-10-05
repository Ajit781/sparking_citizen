package com.sparkingcitizen;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.os.Handler;
import android.os.Looper;

import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.model.BitmapDescriptorFactory;
import com.google.android.gms.maps.model.Marker;
import com.google.android.gms.maps.model.MarkerOptions;
import com.google.maps.android.clustering.Cluster;
import com.google.maps.android.clustering.ClusterManager;
import com.google.maps.android.clustering.view.DefaultClusterRenderer;

public class ParkingClusterRenderer extends DefaultClusterRenderer<ParkingClusterItem> {
    private final Context context;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Bitmap cachedNormalIcon;
    private Bitmap cachedSelectedIcon;
    private Bitmap cachedTapIcon;

    public ParkingClusterRenderer(Context context, GoogleMap map, ClusterManager<ParkingClusterItem> clusterManager) {
        super(context, map, clusterManager);
        this.context = context;
    }

    @Override
    protected void onBeforeClusterItemRendered(ParkingClusterItem item, MarkerOptions markerOptions) {
        Bitmap customIcon;
        if (item.isTap()) {
            if (cachedTapIcon == null) cachedTapIcon = createTapMarker();
            customIcon = cachedTapIcon;
        } else if (item.isSelected()) {
            if (cachedSelectedIcon == null) cachedSelectedIcon = createCustomMarker(true);
            customIcon = cachedSelectedIcon;
        } else {
            if (cachedNormalIcon == null) cachedNormalIcon = createCustomMarker(false);
            customIcon = cachedNormalIcon;
        }
        markerOptions.icon(BitmapDescriptorFactory.fromBitmap(customIcon));
        markerOptions.zIndex(item.isTap() ? 200 : item.isSelected() ? 100 : 0);
        markerOptions.title(item.getTitle());
    }

    @Override
    protected void onClusterItemRendered(ParkingClusterItem clusterItem, Marker marker) {
        super.onClusterItemRendered(clusterItem, marker);
        marker.setTag(clusterItem.getId());
        animateMarker(marker);
    }

    @Override
    protected boolean shouldRenderAsCluster(Cluster<ParkingClusterItem> cluster) {
        return cluster.getSize() > 1; // Cluster if 2 or more items
    }

    @Override
    public int getColor(int clusterSize) {
        // Return Saffron/Primary Theme Color (#F57C00) for all clusters instead of default blue/green
        return Color.parseColor("#F57C00");
    }

    private void animateMarker(final Marker marker) {
        // Disabled animation to prevent OutOfMemoryError and high CPU usage when rendering many markers on Android 11
    }

    public Bitmap createTapMarkerBitmap() {
        return createTapMarker();
    }

    private Bitmap createTapMarker() {
        int w = 60;
        int h = 80; // Taller for pin shape
        Bitmap bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        Paint paint = new Paint();
        paint.setAntiAlias(true);

        // Draw pin drop circle (top part)
        float cx = w / 2f;
        float cy = w / 2f; // circle center at top
        float radius = w / 2f - 3f;

        // Outer circle fill - deep blue/indigo
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(Color.parseColor("#1A56DB"));
        canvas.drawCircle(cx, cy, radius, paint);

        // White border
        paint.setColor(Color.WHITE);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(3.5f);
        canvas.drawCircle(cx, cy, radius - 1f, paint);

        // Inner white dot (like a location pin)
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(Color.WHITE);
        canvas.drawCircle(cx, cy, radius * 0.35f, paint);

        // Draw pin tail (triangle pointing down)
        paint.setColor(Color.parseColor("#1A56DB"));
        paint.setStyle(Paint.Style.FILL);
        android.graphics.Path path = new android.graphics.Path();
        float tailTop = cy + radius - 2f;
        path.moveTo(cx - 10f, tailTop);
        path.lineTo(cx + 10f, tailTop);
        path.lineTo(cx, h - 2f);
        path.close();
        canvas.drawPath(path, paint);

        return bitmap;
    }

    private Bitmap createCustomMarker(boolean isSelected) {
        int size = 60;
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        Paint paint = new Paint();
        paint.setAntiAlias(true);

        // Theme color: Saffron / Orange (#F57C00) for normal, Blue for selected
        paint.setColor(Color.parseColor(isSelected ? "#2196F3" : "#F57C00"));

        // Draw circular background
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint);

        // Draw white border
        paint.setColor(Color.WHITE);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(3.0f);
        canvas.drawCircle(size / 2f, size / 2f, (size / 2f) - 1.5f, paint);

        // Draw 'P'
        paint.setStyle(Paint.Style.FILL);
        paint.setTextSize(30f);
        paint.setFakeBoldText(true);
        paint.setTextAlign(Paint.Align.CENTER);

        // Vertically center text
        Rect textBounds = new Rect();
        paint.getTextBounds("P", 0, 1, textBounds);
        float yPos = (size / 2f) - textBounds.exactCenterY();

        canvas.drawText("P", size / 2f, yPos, paint);

        return bitmap;
    }
}
