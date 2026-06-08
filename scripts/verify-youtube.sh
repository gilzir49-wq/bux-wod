#!/bin/bash
# For each "key|query", fetch YouTube search HTML, take the first videoId,
# verify it via oembed, and emit: key<TAB>videoId<TAB>title
ua="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"

queries=$(cat <<'EOF'
run|crossfit running technique
shuttle_run|shuttle run drill technique
high_knees|high knees exercise how to
double_unders|double unders crossfit tutorial
single_unders|single unders jump rope
row_cal|concept2 rowing technique crossfit
bike_cal|assault bike technique
ski_cal|skierg technique
mountain_climbers|mountain climbers exercise how to
air_squat|air squat crossfit
pushup|push up proper form
situp|abmat sit up crossfit
burpee|burpee crossfit standard
lunge|walking lunge exercise how to
jumping_jacks|jumping jacks exercise
hollow_hold|hollow hold crossfit
plank|forearm plank proper form
pullup|pull up crossfit
chinup|chin up exercise how to
toes_to_bar|toes to bar crossfit
knees_to_elbow|knees to elbow crossfit
ring_row|ring row crossfit
ring_dip|ring dip crossfit
box_jump|box jump crossfit
box_step_up|box step up exercise
handstand_pushup|handstand push up crossfit
pike_pushup|pike push up exercise
wall_walk|wall walk crossfit
broad_jump|broad jump exercise
jumping_lunge|jumping lunge exercise
db_thruster|dumbbell thruster
db_snatch|dumbbell snatch crossfit
devil_press|devil press dumbbell
db_push_press|dumbbell push press
db_goblet_squat|goblet squat dumbbell
db_renegade_row|renegade row dumbbell
db_farmers_carry|farmers carry
kb_swing|kettlebell swing crossfit
kb_goblet_clean|kettlebell clean
kb_snatch|kettlebell snatch
kb_thruster|kettlebell thruster
kb_turkish_getup|turkish get up kettlebell
bb_thruster|barbell thruster crossfit
bb_deadlift|deadlift proper form barbell
bb_clean|power clean crossfit
bb_snatch|power snatch crossfit
bb_front_squat|front squat barbell
bb_back_squat|back squat barbell
bb_push_press|push press barbell
bb_overhead_press|strict press barbell overhead
wall_ball|wall ball crossfit
band_pull_apart|band pull apart exercise
band_press|resistance band shoulder press
band_row|resistance band bent over row
band_good_morning|banded good morning exercise
wu:arm_circles|arm circles warm up
wu:leg_swings|leg swings warm up
wu:worlds_greatest|worlds greatest stretch
wu:inchworm|inchworm exercise
wu:spiderman_lunge|spiderman lunge stretch
wu:hip_circles|hip circles mobility
wu:scap_pullups|scapular pull ups
wu:pass_throughs|shoulder pass throughs pvc
wu:cossack_squat|cossack squat
cd:childs_pose|childs pose stretch
cd:pigeon|pigeon pose stretch
cd:couch|couch stretch hip
cd:forward_fold|standing forward fold stretch
cd:cat_cow|cat cow stretch
cd:thread_needle|thread the needle stretch
cd:cross_shoulder|cross body shoulder stretch
cd:seated_ham|seated hamstring stretch
cd:quad|standing quad stretch
cd:box_breathing|box breathing exercise
EOF
)

while IFS='|' read -r key query; do
  [ -z "$key" ] && continue
  enc=$(printf '%s' "$query" | sed 's/ /+/g')
  vid=$(curl -s -A "$ua" "https://www.youtube.com/results?search_query=${enc}&hl=en" \
        | grep -oE '"videoId":"[A-Za-z0-9_-]{11}"' | head -1 | grep -oE '[A-Za-z0-9_-]{11}')
  if [ -z "$vid" ]; then echo -e "${key}\tNONE\t(no id)"; continue; fi
  oe=$(curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json")
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json")
  if [ "$code" = "200" ]; then
    title=$(printf '%s' "$oe" | grep -oE '"title":"[^"]*"' | head -1 | sed 's/"title":"//; s/"$//')
    echo -e "${key}\t${vid}\t${title}"
  else
    echo -e "${key}\tFAIL_${code}\t-"
  fi
  sleep 0.2
done <<< "$queries"

# (Run as: bash scripts/verify-youtube.sh > /tmp/yt.tsv && regenerate the map.)
# The loop above prints key<TAB>videoId<TAB>title to stdout. To rebuild the
# verified map file from that output:
#   bash scripts/verify-youtube.sh | awk -F'\t' '...' > lib/youtube-map.ts
