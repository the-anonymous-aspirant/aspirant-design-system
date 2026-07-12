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

(def FID (uuid/uuid (or (System/getenv "FILE_ID")
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

;; Ordered registry: {:name <component name> :build (state)->state}.
;; F2 appends entries here. Re-running is idempotent — a component whose name
;; already exists in the file is skipped (see update-fn).
(def component-builders
  [{:name "AspCard" :build asp-card}])

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
