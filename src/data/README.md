# Thailand dashboard boundaries

Retrieved 2026-10-02 from the Department of Disaster Prevention and Mitigation:
https://gis-portal.disaster.go.th/arcgis/rest/services/MapDX/DPM_TH_Boundary/FeatureServer/1

Query: all features, PROV_CODE and PROV_NAM_T, WGS84, GeoJSON,
maxAllowableOffset=0.005, geometryPrecision=4. These simplified boundaries
are for dashboard visualization, not surveying.

The province layer returned 76 features and omitted Satun (91). Satun was
assembled as one MultiPolygon feature from all seven districts in layer 2
of the same service, with the same simplification settings. The downloaded
district source is retained in satun-districts.json. The resulting file has
77 distinct province codes and names including Bangkok and Bueng Kan.
The service supplies no copyrightText; attribution is shown on the dashboard.
