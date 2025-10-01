#!/bin/bash
# set -e: Herhangi bir komut hata verirse betiği anında sonlandırır.
# set -u: Tanımlanmamış değişken kullanımında hata verir.
# set -o pipefail: Pipe (|) içindeki komutlardan herhangi biri hata verirse tüm satırı hatalı sayar.
set -euo pipefail

# ==============================================================================
# 🧠 OKUZ.AI - AKILLI E2E API TEST BETİĞİ (V3 - ASENKRON & DİNAMİK)
#
# Bu betik, farklı personalar ve modlar için dinamik veri oluşturur,
# asenkron plan oluşturma akışını (login -> job submit -> poll status)
# uçtan uca test eder ve sonucu raporlar.
# ==============================================================================

# --- Konfigürasyon ve Renkler ---
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:3002}"
POLL_INTERVAL_SECONDS=${POLL_INTERVAL_SECONDS:-5}
MAX_POLL_ATTEMPTS=${MAX_POLL_ATTEMPTS:-36} # 5 saniye * 36 deneme = 3 dakika timeout
PLAN_DURATION_DAYS=${PLAN_DURATION_DAYS:-7}
LEARNING_STYLE_DEFAULT=${LEARNING_STYLE:-visual}
IMAGE_URL_DEFAULT=${IMAGE_URL:-}

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

# --- Yardımcı Fonksiyonlar ---

# Kullanım talimatlarını gösterir
usage() {
  cat <<'USAGE'
Kullanım:
  ./akilli_e2e_test.sh [persona] [mod]
  Çevresel değişkenlerle:
    BACKEND_URL=... PLAN_DURATION_DAYS=7 LEARNING_STYLE=visual IMAGE_URL=... ./akilli_e2e_test.sh 12-ea normal

Örnekler:
  ./akilli_e2e_test.sh 12-ea normal
  ./akilli_e2e_test.sh mezun-sayisal intensive
  ./akilli_e2e_test.sh 11-sayisal light

Parametreler:
  persona: 12-ea | mezun-sayisal | 11-sayisal | 12-sozel
  mod    : light | normal | intensive
USAGE
}

# Hata mesajı gösterip çıkar
die() {
  echo -e "\n${RED}HATA:${NC} $1" >&2
  exit 1
}

# Bekleme animasyonunu gösterir
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while ps -p $pid > /dev/null; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\r"
    done
    printf "    \r"
}

# --- Ana Fonksiyonlar ---

main() {
  # 1. Girdi ve Bağımlılık Kontrolü
  check_dependencies
  parse_args "$@"
  generate_dynamic_data

  # 2. Test Akışını Başlat
  ACCESS_TOKEN=$(login)
  JOB_ID=$(submit_job "$ACCESS_TOKEN")
  FINAL_PLAN=$(poll_status "$ACCESS_TOKEN" "$JOB_ID")

  # 3. Sonucu Raporla
  report_success "$FINAL_PLAN"
}

check_dependencies() {
  for bin in curl jq; do
    if ! command -v "$bin" >/dev/null 2>&1; then
      die "'$bin' komutu bulunamadı. Lütfen sisteminize kurun."
    fi
  done
}

parse_args() {
  PERSONA="${1:-}"
  MODE="${2:-}"

  if [[ -z "$PERSONA" || -z "$MODE" ]]; then
    usage
    exit 1
  fi
}

# Persona ve moda göre dinamik test verisi üretir
generate_dynamic_data() {
  # Mod -> günlük çalışma saati
  case "$MODE" in
    light)     DAILY_HOURS=2 ;;
    normal)    DAILY_HOURS=4 ;;
    intensive) DAILY_HOURS=7 ;;
    *) die "Geçersiz mod: $MODE. Kabul edilenler: light, normal, intensive" ;;
  esac

  # Persona -> dersler, zayıf alanlar vb.
  case "$PERSONA" in
    12-ea)
      SUBJECTS=("Matematik" "Türkçe" "Edebiyat" "Tarih" "Coğrafya")
      WEAKNESSES=("Limit ve Süreklilik" "Paragrafta Anlam" "İslamiyet Öncesi Türk Tarihi")
      GRADE="12"; ACADEMIC_TRACK="Eşit Ağırlık"
      ;;
    mezun-sayisal)
      SUBJECTS=("Matematik" "Fizik" "Kimya" "Biyoloji" "Geometri")
      WEAKNESSES=("Organik Kimya" "Türev Uygulamaları" "Manyetizma")
      GRADE="Mezun"; ACADEMIC_TRACK="Sayısal"
      ;;
    11-sayisal)
      SUBJECTS=("Matematik" "Fizik" "Kimya" "Biyoloji")
      WEAKNESSES=("Trigonometri" "Kimyasal Denge")
      GRADE="11"; ACADEMIC_TRACK="Sayısal"
      ;;
    12-sozel)
      SUBJECTS=("Edebiyat" "Tarih" "Coğrafya" "Felsefe")
      WEAKNESSES=("Divan Edebiyatı" "TBMM Dönemi" "Nüfus Politikaları")
      GRADE="12"; ACADEMIC_TRACK="Sözel"
      ;;
    *) die "Geçersiz persona: $PERSONA" ;;
  esac
  
  EMAIL="kusursuz_akis_${PERSONA}_${MODE}_$(date +%s)@example.com"
  PASSWORD="DefaultPassword123!"

  echo -e "${BLUE}▶ Test Başlatılıyor${NC}"
  echo "----------------------------------------------------"
  echo -e "  Persona        : ${YELLOW}$PERSONA ($GRADE - $ACADEMIC_TRACK)${NC}"
  echo -e "  İstenen Süre   : ${YELLOW}Günde $DAILY_HOURS saat, Toplam ${PLAN_DURATION_DAYS} gün${NC}"
  echo -e "  Kullanıcı E-posta: ${YELLOW}$EMAIL${NC}"
  echo "----------------------------------------------------"
}

login() {
  echo -e "${YELLOW}⏳ Login işlemi...${NC}"
  
  # Önce login dene, başarısız olursa register ol
  local LOGIN_RESP
  LOGIN_RESP=$(curl -sS -X POST "$BACKEND_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}") || true
  
  local TOKEN
  TOKEN=$(echo "$LOGIN_RESP" | jq -r '.access_token // .accessToken // empty')

  if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
    echo -e "  ${BLUE}ℹ️ Kullanıcı bulunamadı, yeni kayıt oluşturuluyor...${NC}"
    curl -sS -X POST "$BACKEND_URL/auth/register" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Test User\"}" > /dev/null

    echo -e "  ${YELLOW}⏳ Kayıt sonrası tekrar giriş yapılıyor...${NC}"
    LOGIN_RESP=$(curl -sS -X POST "$BACKEND_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
    
    TOKEN=$(echo "$LOGIN_RESP" | jq -r '.access_token // .accessToken // empty')
  fi

  if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
    die "Login işlemi başarısız. Sunucu yanıtı: $LOGIN_RESP"
  fi
  
  echo -e "${GREEN}✅ Login başarılı.${NC}"
  echo "$TOKEN"
}

submit_job() {
  local token="$1"
  echo -e "\n${YELLOW}⏳ Plan oluşturma işi kuyruğa alınıyor...${NC}"
  
  local PAYLOAD
  local AVAILABLE_TIME_MIN
  AVAILABLE_TIME_MIN=$(( DAILY_HOURS * 60 ))

  PAYLOAD=$(jq -n \
    --argjson subjects "$(printf '%s\n' "${SUBJECTS[@]}" | jq -R . | jq -s .)" \
    --argjson focusAreas "$(printf '%s\n' "${WEAKNESSES[@]}" | jq -R . | jq -s .)" \
    --arg learningStyle "$LEARNING_STYLE_DEFAULT" \
    --arg currentLevel "medium" \
    --arg grade "$GRADE" \
    --arg field "$ACADEMIC_TRACK" \
    --argjson availableTime "$AVAILABLE_TIME_MIN" \
    '{
      subjects: $subjects,
      goals: ["Konu eksiği kapatma"],
      availableTime: $availableTime,
      learningStyle: $learningStyle,
      currentLevel: $currentLevel,
      preferences: { focusAreas: $focusAreas },
      studentProfile: {
        grade: ( ($grade|tonumber?) // null ),
        field: $field
      }
    }')

  local GEN_RES
  GEN_RES=$(curl -sS -X POST "$BACKEND_URL/planning/generate-plan" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

  local job_id
  job_id=$(echo "$GEN_RES" | jq -r '.jobId // empty')
  
  if [[ -z "$job_id" || "$job_id" == "null" ]]; then
    die "Plan kuyruğa eklenemedi. Sunucu yanıtı: $GEN_RES"
  fi
  
  echo -e "${GREEN}✅ İş kuyruğa alındı. (Job ID: $job_id)${NC}"
  echo "$job_id"
}

poll_status() {
  local token="$1"
  local job_id="$2"
  echo -e "\n${YELLOW}⏳ Planın hazırlanması bekleniyor (durum ${POLL_INTERVAL_SECONDS} saniyede bir kontrol ediliyor)${NC}"

  local attempt=0
  while [[ $attempt -lt $MAX_POLL_ATTEMPTS ]]; do
    printf "."
    local STATUS_RESP
    STATUS_RESP=$(curl -sf -H "Authorization: Bearer $token" "${BACKEND_URL}/planning/generate-plan/status/${job_id}") || true
    
    if [[ -n "$STATUS_RESP" ]] && jq -e . >/dev/null 2>&1 <<<"$STATUS_RESP"; then
      local status
      status=$(echo "$STATUS_RESP" | jq -r '.status // "unknown"')
      
      if [[ "$status" == "completed" ]]; then
        echo -e "\n${GREEN}✅ İş tamamlandı!${NC}"
        echo "$STATUS_RESP"
        return 0
      elif [[ "$status" == "failed" ]]; then
        local reason
        reason=$(echo "$STATUS_RESP" | jq -r '.failedReason // "Bilinmeyen bir hata oluştu."')
        die "Plan oluşturma işi sunucuda başarısız oldu. Sebep: $reason"
      fi
    fi
    
    sleep "$POLL_INTERVAL_SECONDS"
    ((attempt++))
  done

  die "Plan oluşturma işlemi zaman aşımına uğradı (3 dakika)."
}

report_success() {
  local final_plan="$1"
  
  local PLAN_ID
  PLAN_ID=$(echo "$final_plan" | jq -r '.data.id // empty')
  local TOTAL_HOURS
  TOTAL_HOURS=$(echo "$final_plan" | jq -r '.data.timeline.weeklyBreakdown[0].totalHours // "N/A"')
  local FIRST_DAY
  FIRST_DAY=$(echo "$final_plan" | jq -r '.data.structure.weeklyPlans[0].sessions[0].day // "N/A"')
  local FIRST_DAY_SESSIONS_COUNT
  FIRST_DAY_SESSIONS_COUNT=$(echo "$final_plan" | jq -r --arg d "$FIRST_DAY" '[.data.structure.weeklyPlans[0].sessions[] | select(.day==$d)] | length')
  
  local actual_daily_avg
  if [[ "$TOTAL_HOURS" != "N/A" ]]; then
    actual_daily_avg=$(printf "%.1f" "$(echo "$TOTAL_HOURS / 7" | bc -l)")
  else
    actual_daily_avg="Hesaplanamadı"
  fi
  
  echo -e "\n------------------- ${GREEN}SONUÇ RAPORU${NC} -------------------"
  echo -e "  Plan ID                  : ${BLUE}${PLAN_ID}${NC}"
  echo -e "  İstenen Günlük Ortalama  : ${BLUE}${DAILY_HOURS} saat${NC}"
  echo -e "  Gerçekleşen Günlük Ort.  : ${BLUE}${actual_daily_avg} saat${NC} (1. Hafta Toplam: ${TOTAL_HOURS} sa)"
  echo -e "  İlk Gün (${FIRST_DAY})       : ${BLUE}${FIRST_DAY_SESSIONS_COUNT} seans${NC}"
  echo "----------------------------------------------------"
  echo -e "${GREEN}✅ Test başarıyla tamamlandı.${NC}"
}


# --- Betiği Başlat ---
main "$@"
