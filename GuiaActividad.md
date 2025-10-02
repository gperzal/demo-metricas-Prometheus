# 🚀 Demo de Observabilidad con Prometheus + Grafana + Node.js en Kubernetes (Minikube)

Este laboratorio muestra cómo desplegar una aplicación Node.js instrumentada con Prometheus, monitorearla con Prometheus y visualizar las métricas en Grafana.  
Incluye **correcciones** aplicadas en la configuración de Prometheus y nombres de Services para evitar errores comunes.

---

## 📋 Prerrequisitos

- [Minikube](https://minikube.sigs.k8s.io/docs/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Docker](https://docs.docker.com/get-docker/)

---

## 🔎 Pasos a seguir

### 1. Iniciar Minikube
```bash
minikube start
```

### 2. Crear namespace para monitoreo
```bash
kubectl create namespace monitoring
```

### 3. Construir y cargar la imagen de la app en Minikube
```bash
docker build -t mi-app:v1 .
minikube image load mi-app:v1
```

### 4. Desplegar la aplicación Node.js
```bash
kubectl apply -f app-deployment.yaml
kubectl get pods
```

Deberías ver 2 pods en estado **Running**.

### 5. Verificar el Service de la app
```bash
kubectl get svc
```

El Service `mi-app-service` debería estar escuchando en el puerto **8080**.

### 6. Probar la app localmente
```bash
kubectl port-forward svc/mi-app-service 8080:8080
```

- [http://localhost:8080](http://localhost:8080) → `¡Hola, mundo!`  
- [http://localhost:8080/metrics](http://localhost:8080/metrics) → métricas Prometheus

### 7. Configurar Prometheus
Archivo `prometheus-config.yaml` (corregido, con encabezado de ConfigMap y relabels):
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - action: keep
            source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            regex: "true"
          - action: replace
            source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
            target_label: __metrics_path__
            regex: "(.+)"
          - action: replace
            source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
            regex: "([^:]+)(?::\d+)?;(\d+)"
            replacement: "$1:$2"
            target_label: __address__
```

Aplicar configuración y deployment:
```bash
kubectl apply -f prometheus-config.yaml
kubectl apply -f prometheus-deployment.yaml -n monitoring
```

### 8. Acceder a Prometheus
```bash
kubectl port-forward svc/prometheus-service -n monitoring 9090:9090
```

Abrir [http://localhost:9090](http://localhost:9090) y en **Status → Targets** verificar que los pods `mi-app` estén **UP**.

### 9. Desplegar Grafana
```bash
kubectl apply -f grafana-deployment.yaml -n monitoring
kubectl get pods -n monitoring
```

### 10. Acceder a Grafana
El Service se llama **grafana**, no `grafana-service`.  
```bash
kubectl port-forward svc/grafana -n monitoring 3000:3000
```

Abrir [http://localhost:3000](http://localhost:3000).  
Credenciales por defecto: `admin / admin` (luego pide cambiar la contraseña).

### 11. Configurar la fuente de datos en Grafana
- Ir a *Connections → Data sources*  
- Añadir Prometheus con URL:
  ```
  http://prometheus-service.monitoring.svc.cluster.local:9090
  ```
- Guardar y verificar: **“Data source is working”** ✅

### 12. Probar métricas en Grafana
1. Crear un Dashboard → **+ Add visualization**
2. Seleccionar el Data Source (Prometheus)
3. Query básica:
   ```promql
   http_requests_total
   ```
4. Query con `rate` agrupada por ruta:
   ```promql
   sum by (path) (rate(http_requests_total[1m]))
   ```
5. Guardar panel como *“Tráfico HTTP – Mi App”*
6. Generar tráfico de prueba:
   ```bash
   kubectl run -it --rm curl --image=curlimages/curl --restart=Never --      sh -lc 'for i in $(seq 1 50); do curl -s http://mi-app-service:8080 > /dev/null; done'
   ```

El gráfico en Grafana debería mostrar un spike de tráfico 🚀

---

## 🧹 Limpieza
```bash
kubectl delete -f grafana-deployment.yaml -n monitoring
kubectl delete -f prometheus-deployment.yaml -n monitoring
kubectl delete -f prometheus-config.yaml -n monitoring
kubectl delete -f app-deployment.yaml
minikube delete
```

---

## ✅ Resultado Final

- App Node.js expuesta con métricas en `/metrics`
- Prometheus scrapeando automáticamente los pods con anotaciones
- Grafana conectado a Prometheus y mostrando dashboards en tiempo real

