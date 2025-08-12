package com.calmaquarium;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Process;
import android.provider.Settings;
import android.util.Base64;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.io.ByteArrayOutputStream;
import java.util.Calendar;
import java.util.List;
import java.util.Map;

public class AppUsageModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "AppUsageModule";
    private static final int REQUEST_USAGE_ACCESS_SETTINGS = 1001;
    
    private final ReactApplicationContext reactContext;

    public AppUsageModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * PACKAGE_USAGE_STATS 권한 확인
     */
    @ReactMethod
    public void hasUsageStatsPermission(Promise promise) {
        try {
            AppOpsManager appOpsManager = (AppOpsManager) reactContext.getSystemService(Context.APP_OPS_SERVICE);
            int mode = appOpsManager.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(), reactContext.getPackageName());
            
            boolean hasPermission = mode == AppOpsManager.MODE_ALLOWED;
            promise.resolve(hasPermission);
        } catch (Exception e) {
            promise.reject("PERMISSION_CHECK_ERROR", "권한 확인 실패: " + e.getMessage(), e);
        }
    }

    /**
     * PACKAGE_USAGE_STATS 권한 요청 (설정 화면으로 이동)
     */
    @ReactMethod
    public void requestUsageStatsPermission(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            
            // 사용자가 설정을 변경했는지 즉시 확인할 수 없으므로 
            // 일단 true로 반환하고, 실제 권한 확인은 hasUsageStatsPermission으로 수행
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("PERMISSION_REQUEST_ERROR", "권한 요청 실패: " + e.getMessage(), e);
        }
    }

    /**
     * 앱 사용량 통계 조회
     */
    @ReactMethod
    public void getUsageStats(double timeRangeMs, Promise promise) {
        try {
            // 권한 확인
            AppOpsManager appOpsManager = (AppOpsManager) reactContext.getSystemService(Context.APP_OPS_SERVICE);
            int mode = appOpsManager.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(), reactContext.getPackageName());
            
            if (mode != AppOpsManager.MODE_ALLOWED) {
                promise.reject("NO_PERMISSION", "사용량 통계 권한이 없습니다");
                return;
            }

            UsageStatsManager usageStatsManager = (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
            if (usageStatsManager == null) {
                promise.reject("SERVICE_UNAVAILABLE", "UsageStatsManager를 사용할 수 없습니다");
                return;
            }

            // 시간 범위 설정
            long endTime = System.currentTimeMillis();
            long startTime = endTime - (long) timeRangeMs;

            // 사용량 통계 조회
            Map<String, UsageStats> stats = usageStatsManager.queryAndAggregateUsageStats(
                    startTime, endTime);

            WritableArray result = Arguments.createArray();

            for (Map.Entry<String, UsageStats> entry : stats.entrySet()) {
                UsageStats usageStats = entry.getValue();
                
                // 사용 시간이 0보다 큰 앱만 포함
                if (usageStats.getTotalTimeInForeground() > 0) {
                    WritableMap appUsage = Arguments.createMap();
                    appUsage.putString("packageName", usageStats.getPackageName());
                    appUsage.putDouble("totalTimeInForeground", usageStats.getTotalTimeInForeground());
                    appUsage.putDouble("lastTimeUsed", usageStats.getLastTimeUsed());
                    
                    result.pushMap(appUsage);
                }
            }

            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("USAGE_STATS_ERROR", "사용량 통계 조회 실패: " + e.getMessage(), e);
        }
    }

    /**
     * 설치된 앱 목록 조회
     */
    @ReactMethod
    public void getInstalledApps(Promise promise) {
        try {
            PackageManager packageManager = reactContext.getPackageManager();
            List<ApplicationInfo> installedApps = packageManager.getInstalledApplications(PackageManager.GET_META_DATA);

            WritableArray result = Arguments.createArray();

            for (ApplicationInfo appInfo : installedApps) {
                // 사용자 앱만 포함 (시스템 앱 제외)
                if ((appInfo.flags & ApplicationInfo.FLAG_SYSTEM) == 0) {
                    try {
                        WritableMap app = Arguments.createMap();
                        
                        String packageName = appInfo.packageName;
                        String appName = packageManager.getApplicationLabel(appInfo).toString();
                        
                        // 앱 아이콘을 Base64로 인코딩
                        String iconBase64 = getAppIconAsBase64(packageManager, appInfo);
                        
                        app.putString("packageName", packageName);
                        app.putString("appName", appName);
                        app.putString("icon", iconBase64);
                        
                        result.pushMap(app);
                    } catch (Exception e) {
                        // 개별 앱 처리 실패시 건너뛰기
                        continue;
                    }
                }
            }

            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("INSTALLED_APPS_ERROR", "설치된 앱 조회 실패: " + e.getMessage(), e);
        }
    }

    /**
     * 앱 아이콘을 Base64 문자열로 변환
     */
    private String getAppIconAsBase64(PackageManager packageManager, ApplicationInfo appInfo) {
        try {
            Drawable icon = packageManager.getApplicationIcon(appInfo);
            Bitmap bitmap = drawableToBitmap(icon);
            
            ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, byteArrayOutputStream);
            byte[] byteArray = byteArrayOutputStream.toByteArray();
            
            return Base64.encodeToString(byteArray, Base64.DEFAULT);
        } catch (Exception e) {
            // 아이콘 변환 실패시 빈 문자열 반환
            return "";
        }
    }

    /**
     * Drawable을 Bitmap으로 변환
     */
    private Bitmap drawableToBitmap(Drawable drawable) {
        Bitmap bitmap = Bitmap.createBitmap(
                drawable.getIntrinsicWidth(),
                drawable.getIntrinsicHeight(),
                Bitmap.Config.ARGB_8888
        );
        
        Canvas canvas = new Canvas(bitmap);
        drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
        drawable.draw(canvas);
        
        return bitmap;
    }
}