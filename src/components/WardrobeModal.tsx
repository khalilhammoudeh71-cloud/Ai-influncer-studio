import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shirt, Sparkles, Check, Plus, Trash2, X, Tag, Eye, 
  Crown, Heart, Flame, Shield, Compass, Dumbbell
} from 'lucide-react';
import { Persona, WardrobeItem, WardrobeCategory } from '../types';

export const DEFAULT_WARDROBE: WardrobeItem[] = [
  {
    id: 'outfit-scarlet-corset',
    name: 'Scarlet Satin & Chantilly Lace Corset',
    category: 'lingerie',
    promptDescription: 'wearing an exquisite ruby scarlet red satin boned corset with black Chantilly lace overlay, scalloped sweetheart neckline, matching red satin briefs, luxury master suite',
    thumbnail: '/wardrobe/outfit-scarlet-corset.jpg',
    colorTheme: '#EF4444',
    tags: ['Corset', 'Chantilly Lace', 'Scarlet']
  },
  {
    id: 'outfit-emerald-teddy',
    name: 'Emerald Silk & Sheer Mesh Halter Teddy',
    category: 'lingerie',
    promptDescription: 'wearing a luxurious jewel-tone emerald green silk and sheer black illusion mesh halter teddy bodysuit with a plunging neckline and gold hardware accents',
    thumbnail: '/wardrobe/outfit-emerald-teddy.jpg',
    colorTheme: '#10B981',
    tags: ['Emerald Silk', 'Mesh Teddy', 'Plunging']
  },
  {
    id: 'outfit-midnight-robe',
    name: 'Midnight Blue Floral Lace Bralette & Robe',
    category: 'lingerie',
    promptDescription: 'wearing a sheer dark navy midnight blue floral embroidered lace bralette set under an open sheer silk chiffon kimono robe, ambient bedroom lighting',
    thumbnail: '/wardrobe/outfit-midnight-robe.jpg',
    colorTheme: '#3B82F6',
    tags: ['Midnight Lace', 'Chiffon Robe', 'Sensual']
  },
  {
    id: 'outfit-pearl-babydoll',
    name: 'Champagne Pearl Silk & Lace Babydoll',
    category: 'lingerie',
    promptDescription: 'wearing an iridescent champagne-pearl liquid silk babydoll slip with sheer ivory Chantilly lace bust and delicate double straps, soft morning sunbeams',
    thumbnail: '/wardrobe/outfit-pearl-babydoll.jpg',
    colorTheme: '#F2D58D',
    tags: ['Pearl Silk', 'Babydoll', 'Intimate']
  },
  {
    id: 'outfit-velvet-bustier',
    name: 'Vintage Noir Velvet & Guipure Bustier',
    category: 'lingerie',
    promptDescription: 'wearing a structured noir black velvet bustier with gold-trimmed guipure lace cups and exposed boning channels, matching velvet bottoms, Parisian boudoir',
    thumbnail: '/wardrobe/outfit-velvet-bustier.jpg',
    colorTheme: '#E7C477',
    tags: ['Noir Velvet', 'Guipure Lace', 'Bustier']
  },
  {
    id: 'outfit-blush-chemise',
    name: 'Blush Rose Sheer Pleated Tulle Chemise',
    category: 'lingerie',
    promptDescription: 'wearing a delicate pastel blush rose sheer pleated tulle and silk chemise with embroidered floral appliqués, sweet heart neckline, luxury satin bedroom',
    thumbnail: '/wardrobe/outfit-blush-chemise.jpg',
    colorTheme: '#F472B6',
    tags: ['Blush Tulle', 'Chemise', 'Floral']
  },
  {
    id: 'outfit-velvet-noir',
    name: 'Midnight Velvet Gold-Embroidered Gown',
    category: 'haute_couture',
    promptDescription: 'wearing an exquisite midnight black silk velvet haute couture evening gown with intricate baroque gold embroidery on the front bodice and neckline, luxury diamond drop earrings, luxury gala setting',
    thumbnail: '/wardrobe/outfit-velvet-noir.jpg',
    colorTheme: '#E7C477',
    tags: ['Couture', 'Velvet Gown', 'Red Carpet']
  },
  {
    id: 'outfit-silk-champagne',
    name: 'Golden Hour Liquid Silk Dress',
    category: 'haute_couture',
    promptDescription: 'wearing a liquid metallic champagne silk column dress, architectural high neckline, sleek minimalist atelier tailoring, glowing warm golden reflections',
    thumbnail: '/wardrobe/outfit-silk-champagne.jpg',
    colorTheme: '#F2D58D',
    tags: ['Gala', 'Champagne Silk', 'Minimalist']
  },
  {
    id: 'outfit-corset-satin',
    name: 'Bespoke Satin Corset & Slit Skirt',
    category: 'haute_couture',
    promptDescription: 'wearing a bespoke structured ivory satin boned corset with a high-waisted fluid silk skirt, architectural draping, couture tailoring',
    thumbnail: '/wardrobe/outfit-corset-satin.jpg',
    colorTheme: '#E7C477',
    tags: ['Bespoke', 'Corset', 'Editorial']
  },
  {
    id: 'outfit-emerald-slit',
    name: 'Emerald Silk High-Slit Gown',
    category: 'luxury_evening',
    promptDescription: 'wearing a breathtaking emerald green satin evening gown with a high thigh-high slit, draped cowl neckline, platinum jewelry, luxury penthouse view',
    thumbnail: '/wardrobe/outfit-emerald-slit.jpg',
    colorTheme: '#80CBC4',
    tags: ['Evening', 'Emerald Silk', 'Penthouse']
  },
  {
    id: 'outfit-leather-moto',
    name: 'Distressed Leather & Ribbed Crop',
    category: 'streetwear',
    promptDescription: 'wearing an oversized vintage distressed black leather motorcycle jacket over a sleek ribbed white crop top and high-waisted tailored black trousers, silver chain accents',
    thumbnail: '/wardrobe/outfit-leather-moto.jpg',
    colorTheme: '#81D4FA',
    tags: ['Streetwear', 'Leather Jacket', 'Edgy']
  },
  {
    id: 'outfit-bronze-bikini',
    name: 'Metallic Bronze Ring Bikini',
    category: 'swimwear',
    promptDescription: 'wearing a minimalist metallic bronze two-piece bikini with gold ring hardware accents, sunkissed radiant skin, luxury yacht backdrop',
    thumbnail: '/wardrobe/outfit-bronze-bikini.jpg',
    colorTheme: '#FFB74D',
    tags: ['Swimwear', 'Yacht', 'Sun']
  },
  {
    id: 'outfit-sculpt-gym',
    name: 'Sculpt Ribbed Athleisure Set',
    category: 'fitness',
    promptDescription: 'wearing a premium seamless taupe ribbed sports bra and matching high-waisted sculpting leggings, athletic aesthetic, modern fitness club',
    thumbnail: '/wardrobe/outfit-sculpt-gym.jpg',
    colorTheme: '#A1887F',
    tags: ['Athleisure', 'Seamless Gym', 'Active']
  },
];

interface WardrobeModalProps {
  isOpen: boolean;
  onClose: () => void;
  persona: Persona;
  wardrobe?: WardrobeItem[];
  onEquipOutfit: (outfit: WardrobeItem | null) => void;
  onUpdateWardrobe: (wardrobe: WardrobeItem[]) => void;
  activeOutfitId?: string | null;
  onGeneratePhotoshoot?: (outfit: WardrobeItem) => void;
}

export default function WardrobeModal({
  isOpen,
  onClose,
  persona,
  wardrobe: propWardrobe,
  onEquipOutfit,
  onUpdateWardrobe,
  activeOutfitId,
  onGeneratePhotoshoot
}: WardrobeModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<WardrobeCategory | 'all'>('all');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<WardrobeCategory>('haute_couture');
  const [newDescription, setNewDescription] = useState('');
  const [newThumbnail, setNewThumbnail] = useState('');

  const rawWardrobe = propWardrobe && propWardrobe.length > 0
    ? propWardrobe
    : (persona.wardrobe && persona.wardrobe.length > 0 ? persona.wardrobe : DEFAULT_WARDROBE);

  // Preserve user custom outfits while ensuring all default lookbook items are loaded fresh
  const customItems = (rawWardrobe || []).filter(item => item.isCustom);
  const currentWardrobe = [
    ...DEFAULT_WARDROBE,
    ...customItems
  ];

  const categories: { id: WardrobeCategory | 'all'; label: string; icon: any }[] = [
    { id: 'all', label: 'All Closet', icon: Shirt },
    { id: 'haute_couture', label: 'Haute Couture', icon: Crown },
    { id: 'lingerie', label: 'Lingerie & Sensual', icon: Heart },
    { id: 'luxury_evening', label: 'Luxury Evening', icon: Flame },
    { id: 'streetwear', label: 'Streetwear', icon: Compass },
    { id: 'swimwear', label: 'Swimwear & Beach', icon: Shield },
    { id: 'fitness', label: 'Athleisure', icon: Dumbbell },
  ];

  const filteredItems = selectedCategory === 'all' 
    ? currentWardrobe 
    : currentWardrobe.filter(item => item.category === selectedCategory);

  const handleEquip = (item: WardrobeItem) => {
    if (activeOutfitId === item.id) {
      onEquipOutfit(null); // Unequip
    } else {
      onEquipOutfit(item);
    }
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDescription.trim()) return;

    const newItem: WardrobeItem = {
      id: `outfit-custom-${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      promptDescription: newDescription.trim(),
      thumbnail: newThumbnail.trim() || undefined,
      isCustom: true,
      colorTheme: '#E7C477',
      tags: ['Custom', 'User Created']
    };

    const updated = [newItem, ...currentWardrobe];
    onUpdateWardrobe(updated);
    onEquipOutfit(newItem);
    setNewName('');
    setNewDescription('');
    setNewThumbnail('');
    setIsAddingNew(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = currentWardrobe.filter(item => item.id !== id);
    onUpdateWardrobe(updated);
    if (activeOutfitId === id) {
      onEquipOutfit(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-[#0E1523] border border-[#E7C477]/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-[#E7C477]/15 flex items-center justify-between bg-gradient-to-r from-[#141E30] to-[#0E1523]">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F2D58D] to-[#B99655] flex items-center justify-center text-[#060A13] shadow-md shadow-amber-950/40">
                <Shirt size={20} />
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-[#F8F5EE] flex items-center gap-2">
                  {persona.name}'s Wardrobe Studio
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#E7C477]/15 text-[#F2D58D] border border-[#E7C477]/30">
                    {currentWardrobe.length} Outfits
                  </span>
                </h2>
                <p className="text-xs text-[#8C909A]">
                  Equip an outfit to automatically apply high-fashion consistency across all photoshoots & chats.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddingNew(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#E7C477]/15 hover:bg-[#E7C477]/25 text-[#F2D58D] border border-[#E7C477]/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus size={14} /> Add Outfit
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="px-6 py-3 border-b border-[#E7C477]/10 bg-[#090D17] flex items-center gap-2 overflow-x-auto custom-scrollbar">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    isSelected 
                      ? 'bg-gradient-to-r from-[#B99655] to-[#F2D58D] text-[#060A13] font-bold shadow-md shadow-amber-950/40' 
                      : 'bg-white/5 hover:bg-white/10 text-[#C4C7CF]'
                  }`}
                >
                  <Icon size={13} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            {/* New Outfit Form */}
            {isAddingNew && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddNew}
                className="mb-6 p-5 rounded-2xl bg-[#141E30] border border-[#E7C477]/30 space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#F8F5EE] flex items-center gap-2">
                    <Sparkles size={16} className="text-[#F2D58D]" /> Create Custom Outfit
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => setIsAddingNew(false)}
                    className="text-xs text-white/50 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-[#8C909A] block mb-1">Outfit Name</label>
                    <input 
                      type="text" 
                      value={newName} 
                      onChange={e => setNewName(e.target.value)}
                      placeholder="e.g. Red Carpet Diamond Corset"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#080C14] border border-[#E7C477]/20 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#E7C477]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#8C909A] block mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value as WardrobeCategory)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#080C14] border border-[#E7C477]/20 text-xs text-white focus:outline-none focus:border-[#E7C477]"
                    >
                      <option value="haute_couture">Haute Couture</option>
                      <option value="lingerie">Lingerie & Sensual</option>
                      <option value="luxury_evening">Luxury Evening</option>
                      <option value="streetwear">Streetwear</option>
                      <option value="swimwear">Swimwear & Beach</option>
                      <option value="fitness">Athleisure & Fitness</option>
                      <option value="casual">Casual Luxe</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#8C909A] block mb-1">Thumbnail Image URL (Optional)</label>
                    <input 
                      type="url" 
                      value={newThumbnail} 
                      onChange={e => setNewThumbnail(e.target.value)}
                      placeholder="https://.../outfit-photo.jpg"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#080C14] border border-[#E7C477]/20 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#E7C477]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8C909A] block mb-1">
                    Visual Prompt Description (How the AI renders this outfit)
                  </label>
                  <textarea 
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    placeholder="e.g. wearing a sculpted ruby red silk corset with diamond encrusted straps and a flowing satin floor-length slit skirt..."
                    rows={2}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#080C14] border border-[#E7C477]/20 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#E7C477]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#B99655] to-[#F2D58D] text-[#060A13] text-xs font-bold shadow-md shadow-amber-950/40 hover:opacity-90 cursor-pointer"
                  >
                    Save & Equip to Persona
                  </button>
                </div>
              </motion.form>
            )}

            {/* Outfits Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5">
              {filteredItems.map((item) => {
                const isEquipped = activeOutfitId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleEquip(item)}
                    className={`group relative rounded-2xl border transition-all cursor-pointer flex flex-col overflow-hidden ${
                      isEquipped 
                        ? 'bg-[#151D2C] border-[#F2D58D] shadow-2xl shadow-amber-950/50 ring-2 ring-[#F2D58D]' 
                        : 'bg-[#0E1523] border-[#E7C477]/15 hover:border-[#E7C477]/50 hover:bg-[#131B2C]'
                    }`}
                  >
                    {/* True 9:16 Full Body Outfit Image */}
                    <div className="relative w-full aspect-[9/16] overflow-hidden bg-black/60">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.name}
                          className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#101726] to-[#080C14] text-white/30 p-4">
                          <Shirt size={40} className="text-[#E7C477]/40 mb-2" />
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#E7C477]/70">Couture Garment</span>
                        </div>
                      )}

                      {/* Scrim Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0E1523] via-transparent to-black/60" />

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-1 z-10">
                        <span className="text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[#E7C477] border border-[#E7C477]/40 shadow-md">
                          {item.category.replace('_', ' ')}
                        </span>

                        {isEquipped && (
                          <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#B99655] to-[#F2D58D] text-[#060A13] text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-black/80">
                            <Check size={10} strokeWidth={3} /> Equipped
                          </span>
                        )}
                      </div>

                      {/* Floating bottom info on image */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[#0E1523] via-[#0E1523]/95 to-transparent flex flex-col gap-2 z-10">
                        <div>
                          <h4 className="text-sm font-bold text-[#F8F5EE] group-hover:text-[#F2D58D] transition-colors leading-snug">
                            {item.name}
                          </h4>
                          <p className="text-[10px] text-[#8C909A] mt-0.5 line-clamp-2 leading-relaxed">
                            {item.promptDescription}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-white/10">
                          {item.isCustom && (
                            <button
                              onClick={(e) => handleDelete(item.id, e)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Delete custom outfit"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEquip(item);
                              if (onGeneratePhotoshoot) onGeneratePhotoshoot(item);
                            }}
                            className="w-full py-1.5 rounded-xl bg-gradient-to-r from-[#B99655] to-[#F2D58D] hover:opacity-95 text-[#060A13] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                            title="Virtual Try-On: Generate photoshoot wearing this outfit"
                          >
                            <Sparkles size={12} />
                            <span>Try On</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Active Summary */}
          <div className="p-4 bg-[#090D17] border-t border-[#E7C477]/15 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[#8C909A]">Active Outfit:</span>
              {activeOutfitId ? (
                <span className="font-bold text-[#F2D58D] flex items-center gap-1">
                  <Check size={13} className="text-[#F2D58D]" />
                  {currentWardrobe.find((i: WardrobeItem) => i.id === activeOutfitId)?.name || 'Custom Outfit'}
                </span>
              ) : (
                <span className="text-white/40 italic">None (Default Persona Style)</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeOutfitId && onGeneratePhotoshoot && (
                <button
                  onClick={() => {
                    const activeItem = currentWardrobe.find((i: WardrobeItem) => i.id === activeOutfitId);
                    if (activeItem) onGeneratePhotoshoot(activeItem);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#B99655] to-[#F2D58D] hover:opacity-90 text-[#060A13] font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles size={13} />
                  <span>Generate Look in this Outfit</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
