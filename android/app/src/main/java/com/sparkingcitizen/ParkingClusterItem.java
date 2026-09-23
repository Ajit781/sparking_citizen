package com.sparkingcitizen;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.google.android.gms.maps.model.LatLng;
import com.google.maps.android.clustering.ClusterItem;

public class ParkingClusterItem implements ClusterItem {
    private final LatLng position;
    private final String title;
    private final String snippet;
    private final String id;
    private final boolean isSelected;

    public ParkingClusterItem(double lat, double lng, String title, String id, boolean isSelected) {
        this.position = new LatLng(lat, lng);
        this.title = title;
        this.snippet = "";
        this.id = id;
        this.isSelected = isSelected;
    }

    @NonNull
    @Override
    public LatLng getPosition() {
        return position;
    }

    @Nullable
    @Override
    public String getTitle() {
        return title;
    }

    @Nullable
    @Override
    public String getSnippet() {
        return snippet;
    }

    public String getId() {
        return id;
    }

    public boolean isSelected() {
        return isSelected;
    }

    @Nullable
    @Override
    public Float getZIndex() {
        return isSelected ? 100f : 0f;
    }
}
