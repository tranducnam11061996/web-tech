import pool from '@/lib/db';
import { ComboSetEditClient } from '@/components/products/combo-set/edit/ComboSetEditClient';
// @ts-ignore
import { unserialize } from 'php-serialize';

async function getComboSetById(id: string) {
  try {
    const [rows] = await pool.query('SELECT * FROM combo_set WHERE id = ?', [id]);
    const comboSets = rows as any[];
    
    if (comboSets.length === 0) {
      return null;
    }
    
    const combo = comboSets[0];
    
    // Parse PHP serialized config
    let parsedConfig: any[] = [];
    if (combo.config) {
      try {
        const rawConfig = unserialize(combo.config);
        // Convert object to array if needed (PHP arrays are objects in JS when unserialized with string keys, but here it has integer keys 0,1,2...)
        parsedConfig = Object.values(rawConfig).map((group: any) => ({
          title: group.title || '',
          suggest_list: group.suggest_list ? Object.values(group.suggest_list) : []
        }));
      } catch (err) {
        console.error("Failed to unserialize config:", err);
      }
    }
    
    // Remove raw config from data sent to client
    delete combo.config;
    
    return { ...combo, parsedConfig };
  } catch (error) {
    console.error("Failed to fetch combo set:", error);
    return null;
  }
}

export default async function ComboSetEditPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const id = searchParams?.id as string;
  
  let comboSetData = null;
  
  if (id) {
    comboSetData = await getComboSetById(id);
    if (!comboSetData) {
      return <div className="p-10 text-center text-red-500 font-bold">Không tìm thấy Combo Set!</div>;
    }
  } else {
    // Default data for new Combo Set
    comboSetData = {
      id: 0,
      title: '',
      description: '',
      status: 1,
      from_time: Math.floor(Date.now() / 1000),
      to_time: Math.floor(Date.now() / 1000) + 86400 * 30, // +30 days
      product_count: 0,
      parsedConfig: []
    };
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#050505]">
      <ComboSetEditClient initialData={comboSetData} isNew={!id} />
    </div>
  );
}
