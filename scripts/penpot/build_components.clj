;; Penpot component-builder harness (aspirant-design-system).
;; Registers Asp* Vue components as Penpot Main Components in the
;; `system_3-mockups` file, styled from imported DS tokens (not raw hex).
;;
;; Run inside the Penpot backend container:
;;   docker cp build_components.clj penpot-penpot-backend-1:/tmp/build_components.clj
;;   docker exec -e PENPOT_DATABASE_PASSWORD=<pw> [-e DRY=1] penpot-penpot-backend-1 \
;;     bash -c 'cd /opt/penpot/backend && java -cp penpot.jar clojure.main /tmp/build_components.clj'
;;
;; Write path: app.srepl.helpers/process-file! (get-file realize -> update-fn ->
;; validate -> revn++ -> update-file!). Pointer-map / objects-map persistence and
;; revn are handled by Penpot's own maintenance path. DRY=1 builds + validates
;; without persisting.

(require '[integrant.core :as ig]
         '[app.db :as db]
         '[app.binfile.common :as bfc]
         '[app.srepl.helpers :as h]
         '[app.common.files.builder :as fb]
         '[app.common.files.validate :as cfv]
         '[app.common.uuid :as uuid])

(defn- non-empty [s] (when (and s (seq s)) s))
(def FID (uuid/uuid (or (non-empty (System/getenv "FILE_ID"))
                        "e6414f93-4278-41ac-92e8-e7d83a0b4705"))) ;; system_3-mockups
(def DRY? (= "1" (System/getenv "DRY")))
(def COMPONENTS-PAGE "Components")

(def system
  {:app.db/pool
   (ig/init-key :app.db/pool
     {:app.db/uri (java.net.URI. "postgresql://penpot-postgres/penpot")
      :app.db/username "penpot"
      :app.db/password (System/getenv "PENPOT_DATABASE_PASSWORD")})})

;; --- text content (Penpot bundled font sourcesanspro guarantees render) ---
(defn txt [s {:keys [size weight color]}]
  {:type "root"
   :children [{:type "paragraph-set"
               :children [{:type "paragraph"
                           :key (str (uuid/next))
                           :fills [{:fill-color color :fill-opacity 1}]
                           :font-id "sourcesanspro" :font-family "sourcesanspro"
                           :font-variant-id "regular" :font-style "normal"
                           :font-size size :font-weight weight
                           :line-height "1.3" :letter-spacing "0" :text-align "left"
                           :children [{:text s
                                       :fills [{:fill-color color :fill-opacity 1}]
                                       :font-id "sourcesanspro" :font-family "sourcesanspro"
                                       :font-variant-id "regular" :font-style "normal"
                                       :font-size size :font-weight weight
                                       :line-height "1.3" :letter-spacing "0" :text-align "left"}]}]}]})

;; ============================================================
;; Component specs. Each is (state) -> state adding board+children+component.
;; F2 appends more entries to `component-builders`.
;; ============================================================

(defn asp-card
  "AspCard — Default variant, md padding. surface.card #424242 / border.card #ffb300
   2px / radius.lg 12 / shadow.sm / text.on-dark. Token-bound via :applied-tokens."
  [state]
  (-> state
      (fb/add-board
       {:name "AspCard"
        :x 120 :y 120 :width 360 :height 200
        :fills [{:fill-color "#424242" :fill-opacity 1}]
        :r1 12 :r2 12 :r3 12 :r4 12
        :strokes [{:stroke-color "#ffb300" :stroke-opacity 1 :stroke-width 2
                   :stroke-alignment :inner :stroke-style :solid}]
        :shadow [{:id (uuid/next) :style :drop-shadow
                  :color {:color "#000000" :opacity 0.1}
                  :offset-x 0 :offset-y 2 :blur 4 :spread 0 :hidden false}]
        :applied-tokens {:fill "color.surface.card"
                         :r1 "radius.lg" :r2 "radius.lg" :r3 "radius.lg" :r4 "radius.lg"
                         :stroke-color "color.border.card"}})
      (fb/add-shape
       {:type :text :name "header" :x 136 :y 136 :width 328 :height 26 :grow-type :auto-height
        :content (txt "Card heading" {:size "19" :weight "700" :color "#ffb300"})
        :applied-tokens {:fill "color.text.heading-card"}})
      (fb/add-shape
       {:type :text :name "body" :x 136 :y 170 :width 328 :height 60 :grow-type :auto-height
        :content (txt "Body content styled entirely from imported design tokens — surface, border, radius and shadow all resolve through token references."
                      {:size "16" :weight "400" :color "#ffffff"})
        :applied-tokens {:fill "color.text.on-dark"}})
      (fb/add-shape
       {:type :text :name "footer" :x 136 :y 268 :width 328 :height 18 :grow-type :auto-height
        :content (txt "color.surface.card · radius.lg · shadow.sm · color.border.card"
                      {:size "12" :weight "500" :color "#6c757d"})
        :applied-tokens {:fill "color.text.muted"}})
      (fb/add-component {:component-id (uuid/next) :name "AspCard" :path ""})
      (fb/close-board)))

;; ---- AspButton (primary variant, md size) --------------------------------
;; brand.primary #ffb300 fill, text.on-light label, radius.md 8. Placement: to
;; the right of AspCard on the Components page.
(defn asp-button [state]
  (-> state
      (fb/add-board
       {:name "AspButton"
        :x 560 :y 120 :width 140 :height 40
        :fills [{:fill-color "#ffb300" :fill-opacity 1}]
        :r1 8 :r2 8 :r3 8 :r4 8
        :applied-tokens {:fill "color.brand.primary"
                         :r1 "radius.md" :r2 "radius.md"
                         :r3 "radius.md" :r4 "radius.md"}})
      (fb/add-shape
       {:type :text :name "label" :x 576 :y 130 :width 108 :height 20
        :grow-type :auto-height
        :content (txt "Button" {:size "16" :weight "500" :color "#424242"})
        :applied-tokens {:fill "color.text.on-light"}})
      (fb/add-component {:component-id (uuid/next) :name "AspButton" :path ""})
      (fb/close-board)))

;; ---- AspBadge (status variant, positive/md) ------------------------------
;; feedback.success-bg tinted pill, feedback.success-text label, radius.pill 40.
(defn asp-badge [state]
  (-> state
      (fb/add-board
       {:name "AspBadge"
        :x 740 :y 120 :width 90 :height 24
        :fills [{:fill-color "#e6f7ec" :fill-opacity 1}]
        :r1 40 :r2 40 :r3 40 :r4 40
        :applied-tokens {:fill "color.feedback.success-bg"
                         :r1 "radius.pill" :r2 "radius.pill"
                         :r3 "radius.pill" :r4 "radius.pill"}})
      (fb/add-shape
       {:type :text :name "label" :x 752 :y 125 :width 66 :height 14
        :grow-type :auto-height
        :content (txt "Positive" {:size "14" :weight "500" :color "#005d26"})
        :applied-tokens {:fill "color.feedback.success-text"}})
      (fb/add-component {:component-id (uuid/next) :name "AspBadge" :path ""})
      (fb/close-board)))

;; ---- AspIcon (md size, unicode glyph placeholder) -------------------------
;; surface.elevated square with border.subtle 1px stroke, radius.sm; a Unicode
;; glyph as the icon placeholder (real assets ship via aspirant-icon-pipeline).
(defn asp-icon [state]
  (-> state
      (fb/add-board
       {:name "AspIcon"
        :x 870 :y 116 :width 32 :height 32
        :fills [{:fill-color "#f9f9f9" :fill-opacity 1}]
        :r1 4 :r2 4 :r3 4 :r4 4
        :strokes [{:stroke-color "#cccccc" :stroke-opacity 1 :stroke-width 1
                   :stroke-alignment :inner :stroke-style :solid}]
        :applied-tokens {:fill "color.surface.elevated"
                         :r1 "radius.sm" :r2 "radius.sm"
                         :r3 "radius.sm" :r4 "radius.sm"
                         :stroke-color "color.border.subtle"}})
      (fb/add-shape
       {:type :text :name "glyph" :x 874 :y 118 :width 24 :height 28
        :grow-type :auto-height
        :content (txt "✎" {:size "20" :weight "400" :color "#424242"})
        :applied-tokens {:fill "color.text.on-light"}})
      (fb/add-component {:component-id (uuid/next) :name "AspIcon" :path ""})
      (fb/close-board)))

;; ---- AspSidebar (composite: header + 3 nav-link rows) --------------------
;; surface.elevated panel, border.subtle 1px stroke, radius.md. Three rows
;; simulate AspSidebarLink instances (icon-glyph + label). No prop UI; the
;; operator uses this as one Main Component and edits the copy per instance.
(defn asp-sidebar [state]
  (let [x 120 y 400 w 240 h 360
        row-h 44
        row-y (fn [i] (+ y 80 (* i row-h)))]
    (as-> state $
      (fb/add-board $
       {:name "AspSidebar"
        :x x :y y :width w :height h
        :fills [{:fill-color "#f9f9f9" :fill-opacity 1}]
        :r1 8 :r2 8 :r3 8 :r4 8
        :strokes [{:stroke-color "#cccccc" :stroke-opacity 1 :stroke-width 1
                   :stroke-alignment :inner :stroke-style :solid}]
        :applied-tokens {:fill "color.surface.elevated"
                         :r1 "radius.md" :r2 "radius.md"
                         :r3 "radius.md" :r4 "radius.md"
                         :stroke-color "color.border.subtle"}})
      (fb/add-shape $
       {:type :text :name "sidebar-header" :x (+ x 16) :y (+ y 20) :width (- w 32) :height 24
        :grow-type :auto-height
        :content (txt "Navigation" {:size "16" :weight "700" :color "#424242"})
        :applied-tokens {:fill "color.text.on-light"}})
      (reduce
       (fn [st [i label active?]]
         (-> st
             (fb/add-shape
              {:type :text :name (str "link-" (inc i) "-glyph")
               :x (+ x 16) :y (+ (row-y i) 8) :width 20 :height 20
               :grow-type :auto-height
               :content (txt "◈" {:size "16" :weight "500"
                                   :color (if active? "#ffb300" "#6c757d")})
               :applied-tokens {:fill (if active?
                                        "color.brand.primary"
                                        "color.text.muted")}})
             (fb/add-shape
              {:type :text :name (str "link-" (inc i) "-label")
               :x (+ x 44) :y (+ (row-y i) 10) :width (- w 60) :height 20
               :grow-type :auto-height
               :content (txt label {:size "15" :weight "500"
                                     :color (if active? "#424242" "#6c757d")})
               :applied-tokens {:fill (if active?
                                        "color.text.on-light"
                                        "color.text.muted")}})))
       $
       [[0 "Dashboard" true] [1 "Tasks" false] [2 "Reports" false]])
      (fb/add-component $ {:component-id (uuid/next) :name "AspSidebar" :path ""})
      (fb/close-board $))))

;; ---- AspEmptyState (default `empty` variant) -----------------------------
;; Centered placeholder — icon-glyph + heading + body + action-button shape.
(defn asp-empty-state [state]
  (let [x 560 y 400 w 360 h 260]
    (-> state
        (fb/add-board
         {:name "AspEmptyState"
          :x x :y y :width w :height h
          :fills [{:fill-color "#e4e4e4" :fill-opacity 1}]
          :r1 8 :r2 8 :r3 8 :r4 8
          :applied-tokens {:fill "color.surface.page"
                           :r1 "radius.md" :r2 "radius.md"
                           :r3 "radius.md" :r4 "radius.md"}})
        (fb/add-shape
         {:type :text :name "icon" :x (+ x 168) :y (+ y 40) :width 24 :height 28
          :grow-type :auto-height
          :content (txt "📥" {:size "24" :weight "400" :color "#6c757d"})
          :applied-tokens {:fill "color.text.muted"}})
        (fb/add-shape
         {:type :text :name "heading" :x (+ x 40) :y (+ y 90) :width (- w 80) :height 26
          :grow-type :auto-height
          :content (txt "Nothing here yet" {:size "18" :weight "700" :color "#424242"})
          :applied-tokens {:fill "color.text.on-light"}})
        (fb/add-shape
         {:type :text :name "message" :x (+ x 40) :y (+ y 124) :width (- w 80) :height 40
          :grow-type :auto-height
          :content (txt "Get started by adding your first item."
                        {:size "14" :weight "400" :color "#6c757d"})
          :applied-tokens {:fill "color.text.muted"}})
        (fb/add-shape
         {:type :rect :name "action-button"
          :x (+ x 132) :y (+ y 190) :width 96 :height 36
          :fills [{:fill-color "#ffb300" :fill-opacity 1}]
          :r1 8 :r2 8 :r3 8 :r4 8
          :applied-tokens {:fill "color.brand.primary"
                           :r1 "radius.md" :r2 "radius.md"
                           :r3 "radius.md" :r4 "radius.md"}})
        (fb/add-shape
         {:type :text :name "action-label"
          :x (+ x 148) :y (+ y 200) :width 64 :height 20
          :grow-type :auto-height
          :content (txt "Add item" {:size "14" :weight "500" :color "#424242"})
          :applied-tokens {:fill "color.text.on-light"}})
        (fb/add-component {:component-id (uuid/next) :name "AspEmptyState" :path ""})
        (fb/close-board))))

;; ---- AspTypography (H1 / H2 / Prose preset stack) ------------------------
;; Vertical stack: showing the three primary type presets on surface.card-inner
;; so the operator sees the scale at once.
(defn asp-typography [state]
  (let [x 1000 y 400 w 320 h 240]
    (-> state
        (fb/add-board
         {:name "AspTypography"
          :x x :y y :width w :height h
          :fills [{:fill-color "#f9f9f9" :fill-opacity 1}]
          :r1 8 :r2 8 :r3 8 :r4 8
          :applied-tokens {:fill "color.surface.elevated"
                           :r1 "radius.md" :r2 "radius.md"
                           :r3 "radius.md" :r4 "radius.md"}})
        (fb/add-shape
         {:type :text :name "h1" :x (+ x 20) :y (+ y 20) :width (- w 40) :height 44
          :grow-type :auto-height
          :content (txt "Heading 1" {:size "29" :weight "700" :color "#424242"})
          :applied-tokens {:fill "color.text.on-light"}})
        (fb/add-shape
         {:type :text :name "h2" :x (+ x 20) :y (+ y 80) :width (- w 40) :height 34
          :grow-type :auto-height
          :content (txt "Heading 2" {:size "22" :weight "700" :color "#424242"})
          :applied-tokens {:fill "color.text.on-light"}})
        (fb/add-shape
         {:type :text :name "prose" :x (+ x 20) :y (+ y 130) :width (- w 40) :height 96
          :grow-type :auto-height
          :content (txt "Prose paragraph body text — sets the readable long-form baseline for AspProse and view copy blocks."
                        {:size "16" :weight "400" :color "#424242"})
          :applied-tokens {:fill "color.text.on-light"}})
        (fb/add-component {:component-id (uuid/next) :name "AspTypography" :path ""})
        (fb/close-board))))

;; ---- AspDataTable (composite: header row + 3 body rows) ------------------
;; DS-themed sortable table. Header carries ▲ sort indicator; body rows share
;; border.subtle divider styling.
(defn asp-data-table [state]
  (let [x 120 y 800 w 560 header-h 40 row-h 40
        col-1 220 col-2 200 col-3 140
        head-y y
        body-y (fn [i] (+ y header-h (* i row-h)))]
    (as-> state $
      (fb/add-board $
       {:name "AspDataTable"
        :x x :y y :width w :height (+ header-h (* 3 row-h))
        :fills [{:fill-color "#f9f9f9" :fill-opacity 1}]
        :r1 8 :r2 8 :r3 8 :r4 8
        :strokes [{:stroke-color "#cccccc" :stroke-opacity 1 :stroke-width 1
                   :stroke-alignment :inner :stroke-style :solid}]
        :applied-tokens {:fill "color.surface.elevated"
                         :r1 "radius.md" :r2 "radius.md"
                         :r3 "radius.md" :r4 "radius.md"
                         :stroke-color "color.border.subtle"}})
      ;; Header background strip
      (fb/add-shape $
       {:type :rect :name "header-bg"
        :x x :y head-y :width w :height header-h
        :fills [{:fill-color "#e4e4e4" :fill-opacity 1}]
        :applied-tokens {:fill "color.surface.page"}})
      (fb/add-shape $
       {:type :text :name "header-name"
        :x (+ x 16) :y (+ head-y 12) :width (- col-1 16) :height 18
        :grow-type :auto-height
        :content (txt "Name  ▲" {:size "14" :weight "700" :color "#424242"})
        :applied-tokens {:fill "color.text.on-light"}})
      (fb/add-shape $
       {:type :text :name "header-status"
        :x (+ x col-1) :y (+ head-y 12) :width (- col-2 8) :height 18
        :grow-type :auto-height
        :content (txt "Status" {:size "14" :weight "700" :color "#424242"})
        :applied-tokens {:fill "color.text.on-light"}})
      (fb/add-shape $
       {:type :text :name "header-value"
        :x (+ x col-1 col-2) :y (+ head-y 12) :width (- col-3 16) :height 18
        :grow-type :auto-height
        :content (txt "Value" {:size "14" :weight "700" :color "#424242"})
        :applied-tokens {:fill "color.text.on-light"}})
      ;; Three body rows, each with three cells.
      (reduce
       (fn [st [i nm status value]]
         (-> st
             (fb/add-shape
              {:type :text :name (str "row-" (inc i) "-name")
               :x (+ x 16) :y (+ (body-y i) 12) :width (- col-1 16) :height 18
               :grow-type :auto-height
               :content (txt nm {:size "14" :weight "400" :color "#424242"})
               :applied-tokens {:fill "color.text.on-light"}})
             (fb/add-shape
              {:type :text :name (str "row-" (inc i) "-status")
               :x (+ x col-1) :y (+ (body-y i) 12) :width (- col-2 8) :height 18
               :grow-type :auto-height
               :content (txt status {:size "14" :weight "400" :color "#6c757d"})
               :applied-tokens {:fill "color.text.muted"}})
             (fb/add-shape
              {:type :text :name (str "row-" (inc i) "-value")
               :x (+ x col-1 col-2) :y (+ (body-y i) 12) :width (- col-3 16) :height 18
               :grow-type :auto-height
               :content (txt value {:size "14" :weight "400" :color "#424242"})
               :applied-tokens {:fill "color.text.on-light"}})))
       $
       [[0 "Row one" "Active" "12"]
        [1 "Row two" "Pending" "48"]
        [2 "Row three" "Done" "7"]])
      (fb/add-component $ {:component-id (uuid/next) :name "AspDataTable" :path ""})
      (fb/close-board $))))

;; Ordered registry: {:name <component name> :build (state)->state}.
;; F2 appends entries here. Re-running is idempotent — a component whose name
;; already exists in the file is skipped (see update-fn).
(def component-builders
  [{:name "AspCard"       :build asp-card}
   {:name "AspButton"     :build asp-button}
   {:name "AspBadge"      :build asp-badge}
   {:name "AspIcon"       :build asp-icon}
   {:name "AspSidebar"    :build asp-sidebar}
   {:name "AspEmptyState" :build asp-empty-state}
   {:name "AspTypography" :build asp-typography}
   {:name "AspDataTable"  :build asp-data-table}])

;; --- seed builder state from an existing file's data ---
(defn seed-state [file]
  (let [fid  (:id file)
        data (:data file)
        cpage (some (fn [pid]
                      (when (= COMPONENTS-PAGE (get-in data [:pages-index pid :name])) pid))
                    (:pages data))
        st0 (-> (fb/create-state)
                (assoc :app.common.files.builder/current-file-id fid)
                (assoc-in [:app.common.files.builder/files fid :data] data))]
    (if cpage
      (-> st0
          (assoc :app.common.files.builder/current-page-id cpage)
          (assoc :app.common.files.builder/current-frame-id uuid/zero)
          (assoc :app.common.files.builder/parent-stack [uuid/zero]))
      (fb/add-page st0 {:name COMPONENTS-PAGE}))))

(defn update-fn [file & _]
  (let [fid      (:id file)
        existing (into #{} (map :name) (vals (get-in file [:data :components])))
        pending  (remove #(contains? existing (:name %)) component-builders)]
    (doseq [{:keys [name]} component-builders]
      (println (if (contains? existing name) "  skip (exists):" "  add:") name))
    (if (empty? pending)
      file ;; nothing to do — identity return keeps process-file! a no-op
      (let [state (reduce (fn [st {:keys [build]}] (build st)) (seed-state file) pending)
            data' (get-in state [:app.common.files.builder/files fid :data])]
        (assoc file :data data')))))

;; --- run ---
(if DRY?
  (db/run! system
    (fn [sys]
      (let [file  (bfc/get-file sys FID :realize? true)
            file' (update-fn file)]
        (cfv/validate-file-schema! file')
        (println "DRY OK. components now:"
                 (count (get-in file' [:data :components]))
                 "names:" (pr-str (map :name (vals (get-in file' [:data :components]))))))))
  (db/tx-run! system
    (fn [sys]
      (h/process-file! sys FID update-fn)
      (println "PERSISTED."))))

(println "DONE")
