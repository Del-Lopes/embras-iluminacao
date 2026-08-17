'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, RefreshCw } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { R2Upload } from '@/components/admin/r2-upload'
import { useGlbMaterials } from '@/components/admin/useGlbMaterials'
import type {
  Model3dArScale,
  Model3dMaterialLabels,
  Model3dObjectType,
  Model3dVariation,
} from '@/lib/db/schema'

// Single-panel editor for the 3D model: AR config + per-material color/texture
// variations. Fully controlled by the parent form (no internal source of truth),
// so opening a saved product just renders its stored data and everything persists
// on the normal product save. This component pulls in @google/model-viewer (via
// useGlbMaterials) and is dynamically imported by the editor only when the 3D
// switcher is on — products without 3D never pay for the library.

type Props = {
  slug: string
  modelUrl: string
  objectType: Model3dObjectType
  arScale: Model3dArScale
  materialLabels: Model3dMaterialLabels
  variations: Model3dVariation[]
  // Edição de produto existente → a lista de materiais começa aberta.
  isEdit?: boolean
  onObjectTypeChange: (v: Model3dObjectType) => void
  onArScaleChange: (v: Model3dArScale) => void
  onMaterialLabelsChange: (v: Model3dMaterialLabels) => void
  onVariationsChange: (v: Model3dVariation[]) => void
}

const DEFAULT_COLOR = '#888888'

export function Model3dVariations({
  slug,
  modelUrl,
  objectType,
  arScale,
  materialLabels,
  variations,
  isEdit = false,
  onObjectTypeChange,
  onArScaleChange,
  onMaterialLabelsChange,
  onVariationsChange,
}: Props) {
  const { status, materials, error, read, reset } = useGlbMaterials()
  const [replacedNotice, setReplacedNotice] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [listOpen, setListOpen] = useState(isEdit)
  // Materiais "finalizados" pelo usuário — apenas visual (não persiste),
  // ajuda a acompanhar quais já foram configurados.
  const [savedMaterials, setSavedMaterials] = useState<Set<string>>(new Set())

  const toggleSaved = (material: string) =>
    setSavedMaterials((prev) => {
      const next = new Set(prev)
      if (next.has(material)) next.delete(material)
      else next.add(material)
      return next
    })

  const prevUrlRef = useRef<string | null>(null)
  const initializedRef = useRef(false)

  // React to the model URL: initial read for new/legacy models, wipe+reread on
  // replacement. No DB/R2 mutation here — only local form state changes.
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      prevUrlRef.current = modelUrl
      // Saved product already carries material names in the labels map → no need
      // to download the GLB. Only read live when there's a model but no labels.
      if (modelUrl && Object.keys(materialLabels).length === 0) read(modelUrl)
      return
    }
    if (modelUrl === prevUrlRef.current) return
    const hadModel = !!prevUrlRef.current
    prevUrlRef.current = modelUrl

    if (!modelUrl) {
      reset()
      onMaterialLabelsChange({})
      onVariationsChange([])
      setReplacedNotice(false)
      setSavedMaterials(new Set())
      return
    }
    // Different, non-empty model → this is a replacement (only if a model was
    // set before). Wipe the now-invalid variations and re-read from scratch.
    if (hadModel && (Object.keys(materialLabels).length > 0 || variations.length > 0)) {
      onMaterialLabelsChange({})
      onVariationsChange([])
      setReplacedNotice(true)
      setSavedMaterials(new Set())
    }
    read(modelUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl])

  // Effective material list: live-read names win; otherwise the saved labels keys.
  const materialNames =
    materials.length > 0 ? materials : Object.keys(materialLabels)

  // Variações só aparecem se o modelo tiver ao menos 1 material (mantém o
  // feedback enquanto lê / em erro, para permitir recarregar).
  const showVariations =
    materialNames.length > 0 || status === 'loading' || status === 'error'

  const setLabel = (material: string, friendly: string) =>
    onMaterialLabelsChange({ ...materialLabels, [material]: friendly })

  const addVariation = (material: string) =>
    onVariationsChange([
      ...variations,
      { material, name: '', type: 'color', color: DEFAULT_COLOR, texture_url: '' },
    ])

  const updateVariation = (index: number, patch: Partial<Model3dVariation>) =>
    onVariationsChange(variations.map((v, i) => (i === index ? { ...v, ...patch } : v)))

  const removeVariation = (index: number) =>
    onVariationsChange(variations.filter((_, i) => i !== index))

  // Sem modelo não há nada a configurar — a dica fica no field-group do uploader
  // (product-editor), espelhando o padrão de "Imagens do produto".
  if (!modelUrl) return null

  return (
    <div className="model3d-variations">
      <h4 className="model3d-title">Configurações do Modelo 3D</h4>

      {/* AR config */}
      <div className="editor-row">
        <div className="field-group">
          <Label htmlFor="model_3d_object_type">Tipo de objeto</Label>
          <select
            id="model_3d_object_type"
            className="editor-select"
            value={objectType}
            onChange={(e) => onObjectTypeChange(e.target.value as Model3dObjectType)}
          >
            <option value="floor">Chão / Mesa</option>
            <option value="wall">Parede</option>
          </select>
          <p className="field-hint">Define o posicionamento do objeto no AR.</p>
        </div>
        <div className="field-group">
          <Label htmlFor="model_3d_ar_scale">Escala do AR</Label>
          <select
            id="model_3d_ar_scale"
            className="editor-select"
            value={arScale}
            onChange={(e) => onArScaleChange(e.target.value as Model3dArScale)}
          >
            <option value="fixed">Fixa</option>
            <option value="auto">Livre</option>
          </select>
          <p className="field-hint">Se o objeto pode ser redimensionado no AR.</p>
        </div>
      </div>

      {showVariations && (
        <>
      <hr className="model3d-sep" />

      <div className="model3d-variations-head">
        <h4 className="model3d-title">Variações (cor/textura)</h4>
        <button
          type="button"
          className="model3d-help-summary"
          onClick={() => setHelpOpen((o) => !o)}
          aria-expanded={helpOpen}
        >
          <span className="model3d-help-q">?</span> Saiba mais
          <ChevronDown
            size={14}
            strokeWidth={2}
            className={`model3d-chevron${helpOpen ? ' model3d-chevron--open' : ''}`}
          />
        </button>
      </div>

      <div className="model3d-help">
        <div className={`model3d-collapse${helpOpen ? ' model3d-collapse--open' : ''}`}>
          <div className="model3d-collapse-inner">
            <div className="model3d-help-body">
              <p>
                Cada material representa uma parte específica do objeto que vem pré-definido
                no modelo 3D. As variações são agrupadas de acordo com o material alvo escolhido.
              </p>
              <div className="model3d-help-gifs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/material_alvo-gif.gif" alt="Lista de materiais no modelo 3D" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/nome-grupo-gif.gif" alt="Seletor de variações na página do produto" />
              </div>
              <p>
                <strong>Ex</strong>: Podemos atribuir o nome &quot;Base de Metal&quot; para o
                material &quot;Linea_-_Metal_Preto_Fosco&quot;.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status / materials header */}
      <div className="model3d-status">
        <span className="model3d-status-text">
          {status === 'loading' && 'Lendo materiais do modelo…'}
          {status === 'error' && <span className="field-error">{error}</span>}
          {status !== 'loading' && materialNames.length > 0 && (
            <>
              Seu modelo possui <strong>{materialNames.length}</strong>{' '}
              {materialNames.length === 1 ? 'material' : 'materiais'}
            </>
          )}
          {status !== 'loading' && materialNames.length === 0 && status !== 'error' && (
            <span className="field-hint">Nenhum material lido ainda.</span>
          )}
        </span>
        <button
          type="button"
          className="model3d-refresh-btn"
          onClick={() => {
            setReplacedNotice(false)
            read(modelUrl)
          }}
          title="Recarregar a lista de materiais"
          aria-label="Recarregar a lista de materiais"
        >
          <RefreshCw size={16} strokeWidth={2} />
        </button>
      </div>

      <hr className="model3d-sep model3d-sep--solid" />

      {replacedNotice && (
        <p className="model3d-replaced-notice">
          O modelo foi alterado — as variações anteriores foram removidas. Configure
          novamente com base nos novos materiais.
        </p>
      )}

      {/* Lista de materiais dentro de um toggle "Exibir lista" */}
      <div className="model3d-list-toggle">
        <button
          type="button"
          className="model3d-list-summary"
          onClick={() => setListOpen((o) => !o)}
          aria-expanded={listOpen}
        >
          Exibir lista
          <ChevronDown
            size={14}
            strokeWidth={2}
            className={`model3d-chevron${listOpen ? ' model3d-chevron--open' : ''}`}
          />
        </button>
        <div className={`model3d-collapse${listOpen ? ' model3d-collapse--open' : ''}`}>
          <div className="model3d-collapse-inner">
            <div className="model3d-list-body">
              <p className="model3d-disclaimer">
                Você pode cadastrar o produto sem inserir nenhuma variação, ele será exibido
                com a opção padrão na página do produto.
              </p>

              {materialNames.map((material) => {
        const rows = variations
          .map((v, i) => ({ v, i }))
          .filter((x) => x.v.material === material)

        const isSaved = savedMaterials.has(material)

        return (
          <div
            key={material}
            className={`model3d-material${isSaved ? ' model3d-material--saved' : ''}`}
          >
            <fieldset className="model3d-material-fields" disabled={isSaved}>
            <div className="model3d-material-head">
              <div className="field-group">
                <Label>Material: <code className="model3d-tech">{material}</code></Label>
                <Input
                  placeholder="Nome amigável (ex.: Metal, Estofado)"
                  value={materialLabels[material] ?? ''}
                  onChange={(e) => setLabel(material, e.target.value)}
                />
              </div>
            </div>

            {rows.length > 0 && (
              <div className="model3d-var-list">
                {rows.map(({ v, i }) => (
                  <div key={i} className="model3d-var-row">
                    <div className="field-group model3d-var-name">
                      <Label>Nome da variação</Label>
                      <Input
                        placeholder="Ex.: Azul"
                        value={v.name}
                        onChange={(e) => updateVariation(i, { name: e.target.value })}
                      />
                    </div>

                    <div className="field-group">
                      <Label>Tipo</Label>
                      <select
                        className="editor-select"
                        value={v.type}
                        onChange={(e) =>
                          updateVariation(i, {
                            type: e.target.value as Model3dVariation['type'],
                          })
                        }
                      >
                        <option value="color">Cor sólida</option>
                        <option value="texture">Textura</option>
                      </select>
                    </div>

                    {v.type === 'color' ? (
                      <div className="field-group model3d-color">
                        <Label>Cor</Label>
                        <div className="model3d-color-row">
                          <input
                            type="color"
                            className="model3d-color-picker"
                            value={v.color || DEFAULT_COLOR}
                            onChange={(e) => updateVariation(i, { color: e.target.value })}
                          />
                          <Input
                            value={v.color || ''}
                            placeholder="#RRGGBB"
                            onChange={(e) => updateVariation(i, { color: e.target.value })}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="field-group model3d-texture">
                        <Label>Textura</Label>
                        <R2Upload
                          value={v.texture_url ?? ''}
                          onChange={(url) => updateVariation(i, { texture_url: url })}
                          group="model"
                          folder={slug}
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      className="image-remove-btn model3d-var-remove"
                      onClick={() => removeVariation(i)}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="model3d-outline-btn btn-xs"
              onClick={() => addVariation(material)}
            >
              + Adicionar variação
            </button>
            </fieldset>

            {rows.length > 0 && (
              <div className="model3d-material-actions">
                <button
                  type="button"
                  className={`btn-xs${isSaved ? ' model3d-outline-btn' : ' model3d-save-btn'}`}
                  onClick={() => toggleSaved(material)}
                >
                  {isSaved ? 'Editar' : 'Salvar'}
                </button>
              </div>
            )}
          </div>
        )
      })}
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  )
}

export default Model3dVariations
