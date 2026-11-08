{{/*
Self-contained helpers. The label schema matches the ai-server / ai-agent-client charts so
cross-repo selectors (NetworkPolicies, dashboards) see one family.
*/}}

{{- define "novadent-frontend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "novadent-frontend.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "novadent-frontend.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{ include "novadent-frontend.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: novadent
{{- end -}}

{{- define "novadent-frontend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "novadent-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "novadent-frontend.image" -}}
{{- $tag := required "image.tag is required: set an immutable tag (sha-<short>); there is deliberately no default." .Values.image.tag | toString -}}
{{- if eq $tag "latest" -}}
{{- fail "image.tag must not be 'latest': Argo CD cannot detect drift on a mutable tag." -}}
{{- end -}}
{{- printf "%s:%s" .Values.image.repository $tag -}}
{{- end -}}

{{- define "novadent-frontend.backend" -}}
{{- $mode := .Values.config.backend | default "remote" | toString -}}
{{- if not (or (eq $mode "mock") (eq $mode "remote")) -}}
{{- fail (printf "config.backend must be 'mock' or 'remote', got %q" $mode) -}}
{{- end -}}
{{- $mode -}}
{{- end -}}

{{- define "novadent-frontend.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "novadent-frontend.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}
