import React, { useState, useEffect, useRef } from 'react';
import { Entity, Attribute, Association, Connection, RelationType } from '../types';
import { Plus, Trash2, ArrowRightLeft, Database, Download, Upload, XCircle, Image, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { AttributeList } from './AttributeList';

interface SidebarProps {
  entities: Entity[];
  associations: Association[];
  onAddEntity: (name: string) => void;
  onUpdateEntity: (entity: Entity) => void;
  onDeleteEntity: (id: string) => void;
  onAddAssociation: (assoc: Omit<Association, 'id'>) => void;
  onUpdateAssociation: (assoc: Association) => void;
  onDeleteAssociation: (id: string) => void;
  selectedItems: Map<string, 'entity' | 'association'>;
  onExport: () => void;
  onExportPng: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  focusField?: { type: 'entity-name' | 'association-label' | 'cardinality'; id: string; connectionIndex?: number } | null;
  onFocusHandled?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  entities,
  associations,
  onAddEntity,
  onUpdateEntity,
  onDeleteEntity,
  onAddAssociation,
  onUpdateAssociation,
  onDeleteAssociation,
  selectedItems,
  onExport,
  onExportPng,
  onImport,
  onClear,
  focusField,
  onFocusHandled
}) => {
  const { theme, toggleTheme } = useTheme();
  const [newEntityName, setNewEntityName] = useState('');
  const [activeTab, setActiveTab] = useState<'entities' | 'associations'>('entities');

  // Refs for auto-focus on entity name and association label
  const entityNameRef = useRef<HTMLInputElement>(null);
  const assocLabelRef = useRef<HTMLInputElement>(null);

  // Derive single selection from multi-selection for edit panel
  const selectedId = selectedItems.size === 1 ? Array.from(selectedItems.keys())[0] : null;
  const selectedType = selectedId ? selectedItems.get(selectedId) : null;

  // Auto-switch tab when selecting an item on the canvas
  useEffect(() => {
    if (selectedItems.size === 1) {
      const type = Array.from(selectedItems.values())[0];
      if (type === 'entity') {
        setActiveTab('entities');
      } else if (type === 'association') {
        setActiveTab('associations');
      }
    }
  }, [selectedItems]);

  // Handle focusField prop for auto-focus
  useEffect(() => {
    if (!focusField) return;

    const timer = setTimeout(() => {
      if (focusField.type === 'entity-name' && entityNameRef.current) {
        entityNameRef.current.focus();
        entityNameRef.current.select();
      } else if (focusField.type === 'association-label' && assocLabelRef.current) {
        assocLabelRef.current.focus();
        assocLabelRef.current.select();
      } else if (focusField.type === 'cardinality' && focusField.connectionIndex !== undefined) {
        // Focus on the cardinality input for the specific connection
        const cardInputs = document.querySelectorAll(`[data-cardinality-assoc="${focusField.id}"]`);
        const targetInput = cardInputs[focusField.connectionIndex] as HTMLInputElement;
        if (targetInput) {
          targetInput.focus();
          targetInput.select();
        }
      }
      onFocusHandled?.();
    }, 50);

    return () => clearTimeout(timer);
  }, [focusField, onFocusHandled]);

  // New Association State
  const [newAssocLabel, setNewAssocLabel] = useState('');

  // Track newly added attribute for auto-focus
  const [newlyAddedAttrId, setNewlyAddedAttrId] = useState<string | null>(null);
  const newAttrInputRef = useRef<HTMLInputElement>(null);

  // Drag-and-drop state for attribute reordering
  const [draggedAttrId, setDraggedAttrId] = useState<string | null>(null);
  const [dragOverAttrId, setDragOverAttrId] = useState<string | null>(null);

  // Helpers for Attributes
  const handleAddAttribute = (isAssoc: boolean, obj: Entity | Association) => {
    const newAttrId = crypto.randomUUID();
    const newAttr: Attribute = { id: newAttrId, name: '', isPk: false };
    if (isAssoc) {
      onUpdateAssociation({ ...obj as Association, attributes: [...obj.attributes, newAttr] });
    } else {
      onUpdateEntity({ ...obj as Entity, attributes: [...obj.attributes, newAttr] });
    }
    // Set the ID for auto-focus
    setNewlyAddedAttrId(newAttrId);
  };

  // Reorder attributes via drag-and-drop
  const reorderAttributes = (isAssoc: boolean, obj: Entity | Association, fromId: string, toId: string) => {
    if (fromId === toId) return;
    const attrs = [...obj.attributes];
    const fromIndex = attrs.findIndex(a => a.id === fromId);
    const toIndex = attrs.findIndex(a => a.id === toId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [movedAttr] = attrs.splice(fromIndex, 1);
    attrs.splice(toIndex, 0, movedAttr);

    if (isAssoc) {
      onUpdateAssociation({ ...obj as Association, attributes: attrs });
    } else {
      onUpdateEntity({ ...obj as Entity, attributes: attrs });
    }
  };

  // Auto-focus on newly added attribute
  useEffect(() => {
    if (newlyAddedAttrId && newAttrInputRef.current) {
      newAttrInputRef.current.focus();
      newAttrInputRef.current.select();
      setNewlyAddedAttrId(null);
    }
  }, [newlyAddedAttrId]);

  const updateAttribute = (isAssoc: boolean, obj: Entity | Association, attrId: string, field: keyof Attribute, value: any) => {
    const updatedAttrs = obj.attributes.map(a => a.id === attrId ? { ...a, [field]: value } : a);
    if (isAssoc) onUpdateAssociation({ ...obj as Association, attributes: updatedAttrs });
    else onUpdateEntity({ ...obj as Entity, attributes: updatedAttrs });
  };

  const deleteAttribute = (isAssoc: boolean, obj: Entity | Association, attrId: string) => {
    const updatedAttrs = obj.attributes.filter(a => a.id !== attrId);
    if (isAssoc) onUpdateAssociation({ ...obj as Association, attributes: updatedAttrs });
    else onUpdateEntity({ ...obj as Entity, attributes: updatedAttrs });
  };

  // Connection Management for Associations
  const addConnection = (assoc: Association) => {
    if (entities.length === 0) return;
    const newConn: Connection = {
      id: crypto.randomUUID(),
      entityId: entities[0].id,
      cardinality: '0..n'
    };
    onUpdateAssociation({ ...assoc, connections: [...assoc.connections, newConn] });
  };

  const updateConnection = (assoc: Association, connId: string, field: keyof Connection, value: string) => {
    const newConns = assoc.connections.map(c => c.id === connId ? { ...c, [field]: value } : c);
    onUpdateAssociation({ ...assoc, connections: newConns });
  };

  const removeConnection = (assoc: Association, connId: string) => {
    onUpdateAssociation({ ...assoc, connections: assoc.connections.filter(c => c.id !== connId) });
  };

  const handleCreateAssociation = () => {
    if (!newAssocLabel.trim()) return;
    onAddAssociation({
      label: newAssocLabel,
      x: 300,
      y: 300,
      attributes: [],
      connections: []
    });
    setNewAssocLabel('');
  };

  // Derived selected object
  const selectedEntity = selectedType === 'entity' ? entities.find(e => e.id === selectedId) : null;
  const selectedAssoc = selectedType === 'association' ? associations.find(a => a.id === selectedId) : null;

  return (
    <div className={`w-80 h-full border-l flex flex-col shadow-xl z-10 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
      {/* Header with Import/Export */}
      <div className={`p-4 border-b flex items-center justify-between transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-gray-200'}`}>
        <h2 className={`font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>UML Builder</h2>
        <div className="flex gap-2">
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded transition-colors ${theme === 'dark' ? 'text-yellow-400 hover:bg-slate-700' : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50'}`}
            title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={onExportPng}
            className={`p-1.5 rounded transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-green-400 hover:bg-slate-700' : 'text-slate-600 hover:text-green-600 hover:bg-green-50'}`}
            title="Exporter en PNG (fond transparent)"
          >
            <Image size={18} />
          </button>
          <button
            onClick={onExport}
            className={`p-1.5 rounded transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-700' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'}`}
            title="Sauvegarder (Export JSON)"
          >
            <Download size={18} />
          </button>
          <label
            className={`p-1.5 rounded transition-colors cursor-pointer ${theme === 'dark' ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-700' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'}`}
            title="Ouvrir (Import JSON)"
          >
            <Upload size={18} />
            <input
              type="file"
              accept=".json"
              onChange={onImport}
              onClick={(e) => { (e.target as HTMLInputElement).value = '' }}
              className="hidden"
            />
          </label>
          <button
            onClick={onClear}
            className={`p-1.5 rounded transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-red-400 hover:bg-slate-700' : 'text-slate-600 hover:text-red-600 hover:bg-red-50'}`}
            title="Effacer tout le diagramme"
          >
            <XCircle size={18} />
          </button>
        </div>
      </div>

      <div className={`flex border-b transition-colors duration-300 ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
        <button
          className={`flex-1 p-3 font-medium text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'entities'
            ? (theme === 'dark' ? 'bg-blue-900/50 text-blue-400 border-b-2 border-blue-400' : 'bg-blue-50 text-blue-600 border-b-2 border-blue-600')
            : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-500 hover:bg-gray-50')}`}
          onClick={() => setActiveTab('entities')}
        >
          <Database size={16} /> Entités
        </button>
        <button
          className={`flex-1 p-3 font-medium text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'associations'
            ? (theme === 'dark' ? 'bg-blue-900/50 text-blue-400 border-b-2 border-blue-400' : 'bg-blue-50 text-blue-600 border-b-2 border-blue-600')
            : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-500 hover:bg-gray-50')}`}
          onClick={() => setActiveTab('associations')}
        >
          <ArrowRightLeft size={16} /> Relations
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* ENTITIES TAB */}
        {activeTab === 'entities' && (
          <div className="space-y-6">
            <form onSubmit={(e) => { e.preventDefault(); if (newEntityName) { onAddEntity(newEntityName); setNewEntityName('') } }} className="space-y-2">
              <label className={`text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Nouvelle Entité</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newEntityName}
                  onChange={(e) => setNewEntityName(e.target.value)}
                  placeholder="Nom (ex: Client)"
                  className={`flex-1 border rounded px-2 py-1 text-sm transition-colors ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'bg-white border-gray-300 text-slate-900'}`}
                />
                <button type="submit" className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700"><Plus size={20} /></button>
              </div>
            </form>

            <hr className={theme === 'dark' ? 'border-slate-700' : 'border-gray-200'} />

            {selectedEntity ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex justify-between items-center">
                  <h3 className={`font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-800'}`}>Éditer: {selectedEntity.name}</h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteEntity(selectedEntity.id); }}
                    className={`p-1 rounded transition-colors ${theme === 'dark' ? 'text-red-400 hover:bg-red-900/50' : 'text-red-500 hover:bg-red-50'}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div>
                  <label className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Nom</label>
                  <input
                    ref={entityNameRef}
                    type="text"
                    value={selectedEntity.name}
                    onChange={(e) => onUpdateEntity({ ...selectedEntity, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAttribute(false, selectedEntity);
                      }
                    }}
                    className={`w-full border rounded px-2 py-1 text-sm font-bold transition-colors ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-slate-900'}`}
                  />
                </div>

                <AttributeList
                  attributes={selectedEntity.attributes}
                  onUpdate={(id, field, value) => updateAttribute(false, selectedEntity, id, field, value)}
                  onDelete={(id) => deleteAttribute(false, selectedEntity, id)}
                  onAdd={() => handleAddAttribute(false, selectedEntity)}
                  onReorder={(fromId, toId) => reorderAttributes(false, selectedEntity, fromId, toId)}
                  newlyAddedAttrId={newlyAddedAttrId}
                  theme={theme}
                />
              </div>
            ) : selectedItems.size > 1 ? (
              <div className={`text-center mt-10 p-4 rounded-lg border ${theme === 'dark' ? 'bg-blue-900/30 border-blue-700 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                <p className="font-semibold">{selectedItems.size} éléments sélectionnés</p>
                <p className="text-xs mt-1 opacity-75">Glissez pour déplacer ensemble</p>
              </div>
            ) : (
              <p className={`text-center text-xs mt-10 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>Sélectionnez une entité pour éditer.</p>
            )}
          </div>
        )}

        {/* ASSOCIATIONS TAB */}
        {activeTab === 'associations' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className={`text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Nouvelle Relation</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAssocLabel}
                  onChange={(e) => setNewAssocLabel(e.target.value)}
                  placeholder="Verbe (ex: achète)"
                  className={`flex-1 border rounded px-2 py-1 text-sm transition-colors ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'bg-white border-gray-300 text-slate-900'}`}
                />
                <button onClick={handleCreateAssociation} className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700"><Plus size={20} /></button>
              </div>
            </div>

            <hr className={theme === 'dark' ? 'border-slate-700' : 'border-gray-200'} />

            {selectedAssoc ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex justify-between items-center">
                  <h3 className={`font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-800'}`}>Relation: {selectedAssoc.label}</h3>
                  <button onClick={() => onDeleteAssociation(selectedAssoc.id)} className={`p-1 rounded ${theme === 'dark' ? 'text-red-400 hover:bg-red-900/50' : 'text-red-500 hover:bg-red-50'}`}><Trash2 size={16} /></button>
                </div>

                <div className="grid gap-2">
                  <div>
                    <label className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Libellé</label>
                    <input ref={assocLabelRef} type="text" value={selectedAssoc.label} onChange={(e) => onUpdateAssociation({ ...selectedAssoc, label: e.target.value })} className={`w-full border rounded px-2 py-1 text-sm font-bold transition-colors ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-slate-900'}`} />
                  </div>
                  {/* Relation Type Selector */}
                  <div>
                    <label className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Type de relation</label>
                    <select
                      value={selectedAssoc.relationType || ''}
                      onChange={(e) => onUpdateAssociation({ ...selectedAssoc, relationType: e.target.value ? e.target.value as RelationType : undefined })}
                      className={`w-full border rounded px-2 py-1 text-sm transition-colors ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-slate-900'}`}
                    >
                      <option value="">Basique (sans flèche)</option>
                      <option value="association">Association (flèche creuse)</option>
                      <option value="inheritance">Héritage (triangle vide)</option>
                      <option value="interface">Interface (pointillé)</option>
                    </select>
                  </div>
                  {/* Entity Name Field */}
                  <div>
                    <label className={`text-xs flex items-center gap-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                      Nom Entité Associative
                      <span className={`text-[10px] font-normal ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>(optionnel)</span>
                    </label>
                    <input
                      type="text"
                      value={selectedAssoc.entityName || ''}
                      onChange={(e) => onUpdateAssociation({ ...selectedAssoc, entityName: e.target.value })}
                      placeholder={selectedAssoc.label}
                      className={`w-full border rounded px-2 py-1 text-sm italic transition-colors ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'bg-white border-gray-300 text-slate-900'}`}
                    />
                  </div>
                  {/* Label Movable checkbox - only for binary associations */}
                  {selectedAssoc.connections.length === 2 && (
                    <div className={`flex items-center gap-2 p-2 rounded border ${theme === 'dark' ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
                      <input
                        type="checkbox"
                        id="isLabelMovable"
                        checked={selectedAssoc.isLabelMovable || false}
                        onChange={(e) => onUpdateAssociation({ ...selectedAssoc, isLabelMovable: e.target.checked })}
                        className="accent-amber-500"
                      />
                      <label htmlFor="isLabelMovable" className={`text-xs cursor-pointer ${theme === 'dark' ? 'text-amber-400' : 'text-amber-800'}`}>
                        Libellé déplaçable
                      </label>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className={`text-xs font-bold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Liens ({selectedAssoc.connections.length})</label>
                    <button onClick={() => addConnection(selectedAssoc)} className={`text-xs px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-blue-900/50 text-blue-400 hover:bg-blue-900' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>+ Lier Entité</button>
                  </div>
                  <div className="space-y-2">
                    {selectedAssoc.connections.map(conn => (
                      <div key={conn.id} className={`p-2 rounded border text-xs space-y-1 transition-colors ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex justify-between">
                          <span className={`font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Vers:</span>
                          <button onClick={() => removeConnection(selectedAssoc, conn.id)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                        </div>
                        <select
                          value={conn.entityId}
                          onChange={(e) => updateConnection(selectedAssoc, conn.id, 'entityId', e.target.value)}
                          className={`w-full p-1 border rounded mb-1 transition-colors ${theme === 'dark' ? 'bg-slate-600 border-slate-500 text-slate-100' : 'bg-white border-gray-300 text-slate-900'}`}
                        >
                          {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        <div className="flex items-center gap-2">
                          <span className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>Card:</span>
                          <input
                            type="text"
                            list="card-options"
                            value={conn.cardinality}
                            onChange={(e) => updateConnection(selectedAssoc, conn.id, 'cardinality', e.target.value)}
                            data-cardinality-assoc={selectedAssoc.id}
                            className={`flex-1 p-1 border rounded transition-colors ${theme === 'dark' ? 'bg-slate-600 border-slate-500 text-slate-100' : 'bg-white border-gray-300 text-slate-900'}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <datalist id="card-options">
                    {['0..1', '1..1', '0..n', '1..n', '0..*', '1..*'].map(opt => <option key={opt} value={opt} />)}
                  </datalist>
                </div>

                <div className={`space-y-2 pt-2 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
                  <AttributeList
                    attributes={selectedAssoc.attributes}
                    onUpdate={(id, field, value) => updateAttribute(true, selectedAssoc, id, field, value)}
                    onDelete={(id) => deleteAttribute(true, selectedAssoc, id)}
                    onAdd={() => handleAddAttribute(true, selectedAssoc)}
                    onReorder={(fromId, toId) => reorderAttributes(true, selectedAssoc, fromId, toId)}
                    newlyAddedAttrId={newlyAddedAttrId}
                    theme={theme}
                    label="Propriétés"
                  />
                  {selectedAssoc.attributes.length === 0 && <p className={`text-[10px] italic ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>Ajoutez des propriétés pour faire une Entité-Association.</p>}
                </div>
              </div>
            ) : (
              <div className="space-y-2 mt-4">
                <h4 className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>Liste des relations</h4>
                {associations.map(a => {
                  const typeLabel = !a.relationType ? 'Basique' : a.relationType === 'inheritance' ? 'Héritage' : a.relationType === 'interface' ? 'Interface' : 'Association';
                  return (
                    <div
                      key={a.id}
                      className={`p-2 border rounded text-xs flex justify-between group transition-colors ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-200 text-slate-900'}`}
                    >
                      <span>{a.label} <span className={theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}>({a.connections.length} liens)</span></span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-slate-600 text-slate-300' : 'bg-gray-100 text-gray-500'}`}>{typeLabel}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};