package org.dynmap.bukkit;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Map;
import org.bukkit.Bukkit;
import org.bukkit.Chunk;
import org.bukkit.Server;
import org.bukkit.World;
import org.dynmap.Log;
import org.dynmap.common.BiomeMap;

/**
 * Helper for isolation of bukkit version specific issues
 */
public class BukkitVersionHelperCB extends BukkitVersionHelperGeneric {
    private Class<?> nmsblock;
    private Class<?> nmsblockarray;
    private Class<?> nmsmaterial;
    private Field blockbyid;
    private Field blockname;
    private Field material;
    
    BukkitVersionHelperCB() {
    }
    @Override
    protected String getNMSPackage() {
        Server srv = Bukkit.getServer();
        /* Get getHandle() method */
        try {
            Method m = srv.getClass().getMethod("getHandle");
            Object scm = m.invoke(srv); /* And use it to get SCM (nms object) */
            return scm.getClass().getPackage().getName();
        } catch (Exception x) {
            Log.severe("Error finding net.minecraft.server packages");
            return null;
        }
    }
    @Override
    protected void loadNMS() {
        // Get block fields
        nmsblock = getNMSClass("net.minecraft.server.Block");
        nmsblockarray = getNMSClass("[Lnet.minecraft.server.Block;");
        nmsmaterial = getNMSClass("net.minecraft.server.Material");
        blockbyid = getField(nmsblock, new String[] { "byId" }, nmsblockarray);
        blockname = getPrivateField(nmsblock, new String[] { "name" }, String.class);
        material = getField(nmsblock, new String[] { "material" }, nmsmaterial);

        /* Set up biomebase fields */
        biomebase = getNMSClass("net.minecraft.server.BiomeBase");
        biomebasearray =  getNMSClass("[Lnet.minecraft.server.BiomeBase;");
        biomebaselist = getField(biomebase, new String[] { "biomes" }, biomebasearray);
        biomebasetemp = getField(biomebase, new String[] { "temperature", "F" }, float.class);
        biomebasehumi = getField(biomebase, new String[] { "humidity", "G" }, float.class);
        biomebaseidstring = getField(biomebase, new String[] { "y" }, String.class);
        biomebaseid = getField(biomebase, new String[] { "id" }, int.class);
        /* n.m.s.World */
        nmsworld = getNMSClass("net.minecraft.server.WorldServer");
        chunkprovserver = getNMSClass("net.minecraft.server.ChunkProviderServer");
        nmsw_chunkproviderserver = getField(nmsworld, new String[] { "chunkProviderServer" }, chunkprovserver);
        
        longhashset = getOBCClassNoFail("org.bukkit.craftbukkit.util.LongHashSet");
        if(longhashset != null) {
            lhs_containskey = getMethod(longhashset, new String[] { "contains" }, new Class[] { int.class, int.class });
        }
        else {
            longhashset = getOBCClass("org.bukkit.craftbukkit.util.LongHashset");
            lhs_containskey = getMethod(longhashset, new String[] { "containsKey" }, new Class[] { int.class, int.class });
        }

        cps_unloadqueue = getFieldNoFail(chunkprovserver, new String[] { "unloadQueue" }, longhashset); 
        if(cps_unloadqueue == null) {
            Log.info("Unload queue not found - default to unload all chunks");
        }
        /** n.m.s.Chunk */
        nmschunk = getNMSClass("net.minecraft.server.Chunk");
        nmsc_removeentities = getMethod(nmschunk, new String[] { "removeEntities" }, new Class[0]);
        nmsc_tileentities = getField(nmschunk, new String[] { "tileEntities" }, Map.class); 
        /** nbt classes */
        nbttagcompound = getNMSClass("net.minecraft.server.NBTTagCompound");
        nbttagbyte = getNMSClass("net.minecraft.server.NBTTagByte");
        nbttagshort = getNMSClass("net.minecraft.server.NBTTagShort");
        nbttagint = getNMSClass("net.minecraft.server.NBTTagInt");
        nbttaglong = getNMSClass("net.minecraft.server.NBTTagLong");
        nbttagfloat = getNMSClass("net.minecraft.server.NBTTagFloat");
        nbttagdouble = getNMSClass("net.minecraft.server.NBTTagDouble");
        nbttagbytearray = getNMSClass("net.minecraft.server.NBTTagByteArray");
        nbttagstring = getNMSClass("net.minecraft.server.NBTTagString");
        nbttagintarray = getNMSClass("net.minecraft.server.NBTTagIntArray");
        compound_get = getMethod(nbttagcompound, new String[] { "get" }, new Class[] { String.class });
        nbttagbyte_val = getField(nbttagbyte, new String[] { "data" }, byte.class);
        nbttagshort_val = getField(nbttagshort, new String[] { "data" }, short.class);
        nbttagint_val = getField(nbttagint, new String[] { "data" }, int.class);
        nbttaglong_val = getField(nbttaglong, new String[] { "data" }, long.class);
        nbttagfloat_val = getField(nbttagfloat, new String[] { "data" }, float.class);
        nbttagdouble_val = getField(nbttagdouble, new String[] { "data" }, double.class);
        nbttagbytearray_val = getField(nbttagbytearray, new String[] { "data" }, byte[].class);
        nbttagstring_val = getField(nbttagstring, new String[] { "data" }, String.class);
        nbttagintarray_val = getField(nbttagintarray, new String[] { "data" }, int[].class);

        /** Tile entity */
        nms_tileentity = getNMSClass("net.minecraft.server.TileEntity");
        nmst_readnbt = getMethod(nms_tileentity, new String[] { "b" }, new Class[] { nbttagcompound });
        nmst_x = getField(nms_tileentity, new String[] { "x" }, int.class); 
        nmst_y = getField(nms_tileentity, new String[] { "y" }, int.class); 
        nmst_z = getField(nms_tileentity, new String[] { "z" }, int.class); 
    }
    @Override
    public void unloadChunkNoSave(World w, Chunk c, int cx, int cz) {
        this.removeEntitiesFromChunk(c);
        w.unloadChunk(cx, cz, false, false);
    }
    /**
     * Get block short name list
     */
    @Override
    public String[] getBlockShortNames() {
        try {
            Object[] byid = (Object[])blockbyid.get(nmsblock);
            String[] names = new String[byid.length];
            for (int i = 0; i < names.length; i++) {
                if (byid[i] != null) {
                    names[i] = (String)blockname.get(byid[i]);
                }
            }
            return names;
        } catch (IllegalArgumentException e) {
        } catch (IllegalAccessException e) {
        }
        return new String[0];
    }
    /**
     * Get biome name list
     */
    @Override
    public String[] getBiomeNames() {
        String[] names;
        /* Find array of biomes in biomebase */
        Object[] biomelist = getBiomeBaseList();
        names = new String[biomelist.length];
        /* Loop through list, starting afer well known biomes */
        for(int i = 0; i < biomelist.length; i++) {
            Object bb = biomelist[i];
            if(bb != null) {
                names[i] = getBiomeBaseIDString(bb);
            }
        }
        return names;
    }
    /**
     * Get block material index list
     */
    public int[] getBlockMaterialMap() {
        try {
            Object[] byid = (Object[])blockbyid.get(nmsblock);
            int[] map = new int[byid.length];
            ArrayList<Object> mats = new ArrayList<Object>();
            for (int i = 0; i < map.length; i++) {
                if (byid[i] != null) {
                    Object mat = (Object)material.get(byid[i]);
                    if (mat != null) {
                        map[i] = mats.indexOf(mat);
                        if (map[i] < 0) {
                            map[i] = mats.size();
                            mats.add(mat);
                        }
                    }
                    else {
                        map[i] = -1;
                    }
                }
            }
            return map;
        } catch (IllegalArgumentException e) {
        } catch (IllegalAccessException e) {
        }
        return new int[0];
    }
}
