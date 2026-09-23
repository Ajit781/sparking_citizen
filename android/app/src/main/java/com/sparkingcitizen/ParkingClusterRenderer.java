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

    public ParkingClusterRenderer(Context context, GoogleMap map, ClusterManager<ParkingClusterItem> clusterManager) {
        super(context, map, clusterManager);
        this.context = context;
    }

    @Override
    protected void onBeforeClusterItemRendered(ParkingClusterItem item, MarkerOptions markerOptions) {
        Bitmap customIcon = createCustomMarker(item.isSelected());
        markerOptions.icon(BitmapDescriptorFactory.fromBitmap(customIcon));
        markerOptions.zIndex(item.isSelected() ? 100 : 0);
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
        final long duration = 1200;
        
        final ValueAnimator animator = ValueAnimator.ofFloat(0, 1);
        animator.setDuration(duration);
        animator.setRepeatCount(ValueAnimator.INFINITE);
        animator.setRepeatMode(ValueAnimator.REVERSE);
        
        animator.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override
            public void onAnimationUpdate(ValueAnimator animation) {
                try {
                    float v = animation.getAnimatedFraction();
                    // Subtle bouncing effect by modulating the anchor point
                    marker.setAnchor(0.5f, 0.5f + (v * 0.15f)); 
                } catch (Exception e) {
                    animator.cancel();
                }
            }
        });
        
        // Stagger animations slightly
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                animator.start();
            }
        }, (long) (Math.random() * 500));
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
