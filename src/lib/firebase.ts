import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  deleteDoc,
  limit
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDEth9uBcIB9NpG8L45NvYbJn_9iD-Wyyw",
  authDomain: "wallpaper-apps-cad2c.firebaseapp.com",
  projectId: "wallpaper-apps-cad2c",
  storageBucket: "wallpaper-apps-cad2c.firebasestorage.app",
  messagingSenderId: "352408897001",
  appId: "1:352408897001:web:cb20f5ebc4ca6bafd1f778",
  measurementId: "G-GPGG6DSYSY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Collection references
const trendingWallpapersRef = collection(db, "TrendingWallpapers");
const bannersRef = collection(db, "Banners");
const categoriesRef = collection(db, "Categories");
const devicesRef = collection(db, "Devices");

// Types
export interface Category {
  categoryName: string;
  categoryType: 'main' | 'brand';
  thumbnail: string;
  subcategories?: string[];
}

export interface Device {
  devices: string[];
  iosVersions?: string[];
}

// Main categories with subcategories
export const mainCategories = {
  "AMOLED & Dark": [],
  "4K & Ultra HD": [],
  "Minimal & Aesthetic": ["Abstract", "Gradient", "Typography"],
  "Nature & Landscapes": ["Mountains", "Beaches", "Forests", "Sky & Clouds"],
  "Anime & Gaming": ["Anime Characters", "Gaming Characters", "Fantasy Worlds"]
};

// Samsung device models from 2019 onwards
export const samsungDeviceModels = [
  // S Series
  "Galaxy S25 series",
  "Galaxy S24 series", 
  "Galaxy S23 series",
  "Galaxy S22 series",
  "Galaxy S21 series",
  "Galaxy S20 series",
  "Galaxy S10 series",
  
  // Note Series
  "Galaxy Note 20 series",
  "Galaxy Note 10 series",
  
  // Z Fold Series
  "Galaxy Z Fold 7",
  "Galaxy Z Fold 6",
  "Galaxy Z Fold 5",
  "Galaxy Z Fold 4",
  "Galaxy Z Fold 3",
  "Galaxy Z Fold 2",
  "Galaxy Fold",
  
  // Z Flip Series
  "Galaxy Z Flip 7",
  "Galaxy Z Flip 6",
  "Galaxy Z Flip 5",
  "Galaxy Z Flip 4",
  "Galaxy Z Flip 3",
  "Galaxy Z Flip",
  
  // A Series
  "Galaxy A56",
  "Galaxy A55",
  "Galaxy A54",
  "Galaxy A53",
  "Galaxy A52",
  "Galaxy A51",
  "Galaxy A50",
  "Galaxy A36",
  "Galaxy A35",
  "Galaxy A34",
  "Galaxy A33",
  "Galaxy A32",
  "Galaxy A31",
  "Galaxy A30",
  "Galaxy A25",
  "Galaxy A24",
  "Galaxy A23",
  "Galaxy A22",
  "Galaxy A21",
  "Galaxy A20",
  "Galaxy A16",
  "Galaxy A15",
  "Galaxy A14",
  "Galaxy A13",
  "Galaxy A12",
  "Galaxy A11",
  "Galaxy A10",
  "Galaxy A05",
  "Galaxy A04",
  "Galaxy A03",
  "Galaxy A02",
  "Galaxy A01",
  "Galaxy A90",
  "Galaxy A80",
  "Galaxy A73",
  "Galaxy A72",
  "Galaxy A71",
  "Galaxy A70",
  
  // M Series
  "Galaxy M62",
  "Galaxy M55",
  "Galaxy M54",
  "Galaxy M53",
  "Galaxy M52",
  "Galaxy M51",
  "Galaxy M42",
  "Galaxy M40",
  "Galaxy M35",
  "Galaxy M34",
  "Galaxy M33",
  "Galaxy M32",
  "Galaxy M31",
  "Galaxy M30",
  "Galaxy M23",
  "Galaxy M21",
  "Galaxy M20",
  "Galaxy M15",
  "Galaxy M14",
  "Galaxy M13",
  "Galaxy M12",
  "Galaxy M11",
  "Galaxy M10",
  
  // F Series
  "Galaxy F55",
  "Galaxy F35",
  "Galaxy F15"
];

// OnePlus device models from OnePlus One to OnePlus 13
export const oneplusDeviceModels = [
  "OnePlus 13",
  "OnePlus Ace 3V",
  "OnePlus Ace 3 Pro",
  "OnePlus Ace 3",
  "OnePlus Nord 4",
  "OnePlus 12",
  "OnePlus Ace 2 Pro",
  "OnePlus Nord N30 5G",
  "OnePlus Nord CE 3 Lite 5G",
  "OnePlus Nord 3 5G",
  "OnePlus Nord CE 3 5G",
  "OnePlus 11",
  "OnePlus Ace 2V",
  "OnePlus Ace 2",
  "OnePlus 10T",
  "OnePlus Ace Pro",
  "OnePlus Ace",
  "OnePlus 10 Pro",
  "OnePlus Nord CE 2 Lite 5G",
  "OnePlus Nord N20 5G",
  "OnePlus Nord CE 2 5G",
  "OnePlus 9RT",
  "OnePlus Nord 2 5G",
  "OnePlus Nord CE 5G",
  "OnePlus 9R",
  "OnePlus 9 Pro",
  "OnePlus 9",
  "OnePlus 8T",
  "OnePlus Nord N10 5G",
  "OnePlus Nord N100",
  "OnePlus Nord",
  "OnePlus 8 Pro",
  "OnePlus 8",
  "OnePlus 7T Pro",
  "OnePlus 7T",
  "OnePlus 7 Pro",
  "OnePlus 7",
  "OnePlus 6T",
  "OnePlus 6",
  "OnePlus 5T",
  "OnePlus 5",
  "OnePlus 3T",
  "OnePlus 3",
  "OnePlus X",
  "OnePlus 2",
  "OnePlus One"
];

// Xiaomi/Mi flagship device models including Civi and Mix Flip series
export const xiaomiDeviceModels = [
  "Xiaomi 17",
  "Xiaomi 15",
  "Xiaomi 14",
  "Xiaomi 14 Civi",
  "Xiaomi 13",
  "Xiaomi 12",
  "Xiaomi Civi 3",
  "Xiaomi Civi 2",
  "Xiaomi Civi 1S",
  "Xiaomi Mi 11",
  "Xiaomi Civi",
  "Mi Mix Fold 4",
  "Mi Mix Flip 2",
  "Mi Mix Fold 3",
  "Mi Mix Flip",
  "Mi Mix Fold 2",
  "Mi Mix Fold",
  "Xiaomi Mi 10",
  "Mi Mix Alpha",
  "Xiaomi Mi 9",
  "Mi Mix 3",
  "Xiaomi Mi 8",
  "Mi Mix 2",
  "Xiaomi Mi 6",
  "Xiaomi Mi 5c",
  "Mi Mix",
  "Xiaomi Mi 5s",
  "Xiaomi Mi 5",
  "Xiaomi Mi 4",
  "Xiaomi Mi 3",
  "Xiaomi Mi 2",
  "Xiaomi Mi 1"
];

// iPhone device models from iPhone 3G to iPhone 16
export const iphoneDeviceModels = [
  "iPhone 16 series",
  "iPhone 15 series",
  "iPhone 14 series",
  "iPhone SE (3rd generation)",
  "iPhone 13 series",
  "iPhone 12 series",
  "iPhone SE (2nd generation)",
  "iPhone 11 series",
  "iPhone XR/XS series",
  "iPhone X series",
  "iPhone 8 series",
  "iPhone 7 series",
  "iPhone SE (1st generation)",
  "iPhone 6s series",
  "iPhone 6 series",
  "iPhone 5c/5s series",
  "iPhone 5 series",
  "iPhone 4S series",
  "iPhone 4 series",
  "iPhone 3GS series",
  "iPhone 3G series"
];

// iOS versions from iOS 1 to iOS 26
export const iosVersions = [
  "iOS 1 (2007)",
  "iOS 2 (2008)",
  "iOS 3 (2009)",
  "iOS 4 (2010)",
  "iOS 5 (2011)",
  "iOS 6 (2012)",
  "iOS 7 (2013)",
  "iOS 8 (2014)",
  "iOS 9 (2015)",
  "iOS 10 (2016)",
  "iOS 11 (2017)",
  "iOS 12 (2018)",
  "iOS 13 (2019)",
  "iOS 14 (2020)",
  "iOS 15 (2021)",
  "iOS 16 (2022)",
  "iOS 17 (2023)",
  "iOS 18 (2024)",
  "iOS 26 (2025)"
];

// iPhone device launch year mapping
export const iphoneDeviceYearMap: { [key: string]: number } = {
  "iPhone 3G series": 2008,
  "iPhone 3GS series": 2009,
  "iPhone 4 series": 2010,
  "iPhone 4S series": 2011,
  "iPhone 5 series": 2012,
  "iPhone 5c/5s series": 2013,
  "iPhone 6 series": 2014,
  "iPhone 6s series": 2015,
  "iPhone SE (1st generation)": 2016,
  "iPhone 7 series": 2016,
  "iPhone 8 series": 2017,
  "iPhone X series": 2017,
  "iPhone XR/XS series": 2018,
  "iPhone 11 series": 2019,
  "iPhone SE (2nd generation)": 2020,
  "iPhone 12 series": 2020,
  "iPhone 13 series": 2021,
  "iPhone SE (3rd generation)": 2022,
  "iPhone 14 series": 2022,
  "iPhone 15 series": 2023,
  "iPhone 16 series": 2024
};

// OnePlus device launch year mapping
export const oneplusDeviceYearMap: { [key: string]: number } = {
  "OnePlus One": 2014,
  "OnePlus 2": 2015,
  "OnePlus X": 2015,
  "OnePlus 3": 2016,
  "OnePlus 3T": 2016,
  "OnePlus 5": 2017,
  "OnePlus 5T": 2017,
  "OnePlus 6": 2018,
  "OnePlus 6T": 2018,
  "OnePlus 7": 2019,
  "OnePlus 7 Pro": 2019,
  "OnePlus 7T": 2019,
  "OnePlus 7T Pro": 2019,
  "OnePlus 8": 2020,
  "OnePlus 8 Pro": 2020,
  "OnePlus 8T": 2020,
  "OnePlus Nord": 2020,
  "OnePlus Nord N10 5G": 2020,
  "OnePlus Nord N100": 2020,
  "OnePlus 9": 2021,
  "OnePlus 9 Pro": 2021,
  "OnePlus 9R": 2021,
  "OnePlus 9RT": 2021,
  "OnePlus Nord CE 5G": 2021,
  "OnePlus Nord 2 5G": 2021,
  "OnePlus 10 Pro": 2022,
  "OnePlus 10T": 2022,
  "OnePlus Ace": 2022,
  "OnePlus Ace Pro": 2022,
  "OnePlus Nord CE 2 5G": 2022,
  "OnePlus Nord CE 2 Lite 5G": 2022,
  "OnePlus Nord N20 5G": 2022,
  "OnePlus 11": 2023,
  "OnePlus Ace 2": 2023,
  "OnePlus Ace 2V": 2023,
  "OnePlus Ace 2 Pro": 2023,
  "OnePlus Nord 3 5G": 2023,
  "OnePlus Nord CE 3 5G": 2023,
  "OnePlus Nord CE 3 Lite 5G": 2023,
  "OnePlus Nord N30 5G": 2023,
  "OnePlus 12": 2023,
  "OnePlus Ace 3": 2024,
  "OnePlus Ace 3 Pro": 2024,
  "OnePlus Ace 3V": 2024,
  "OnePlus Nord 4": 2024,
  "OnePlus 13": 2025
};

// Xiaomi device launch year mapping
export const xiaomiDeviceYearMap: { [key: string]: number } = {
  "Xiaomi Mi 1": 2011,
  "Xiaomi Mi 2": 2012,
  "Xiaomi Mi 3": 2013,
  "Xiaomi Mi 4": 2014,
  "Xiaomi Mi 5": 2016,
  "Xiaomi Mi 5s": 2016,
  "Mi Mix": 2016,
  "Xiaomi Mi 5c": 2017,
  "Xiaomi Mi 6": 2017,
  "Mi Mix 2": 2017,
  "Xiaomi Mi 8": 2018,
  "Mi Mix 3": 2018,
  "Xiaomi Mi 9": 2019,
  "Mi Mix Alpha": 2019,
  "Xiaomi Mi 10": 2020,
  "Xiaomi Mi 11": 2021,
  "Xiaomi Civi": 2021,
  "Mi Mix Fold": 2021,
  "Xiaomi 12": 2022,
  "Xiaomi Civi 1S": 2022,
  "Xiaomi Civi 2": 2022,
  "Mi Mix Fold 2": 2022,
  "Xiaomi 13": 2023,
  "Xiaomi Civi 3": 2023,
  "Mi Mix Fold 3": 2023,
  "Xiaomi 14": 2023,
  "Xiaomi 15": 2024,
  "Xiaomi 14 Civi": 2024,
  "Mi Mix Fold 4": 2024,
  "Mi Mix Flip": 2024,
  "Xiaomi 17": 2025,
  "Mi Mix Flip 2": 2025
};

// Samsung device launch year mapping
export const samsungDeviceYearMap: { [key: string]: number } = {
  // 2019
  "Galaxy S10 series": 2019,
  "Galaxy Note 10 series": 2019,
  "Galaxy Fold": 2019,
  "Galaxy A10": 2019,
  "Galaxy A20": 2019,
  "Galaxy A30": 2019,
  "Galaxy A50": 2019,
  "Galaxy A70": 2019,
  "Galaxy A80": 2019,
  "Galaxy A90": 2019,
  "Galaxy M10": 2019,
  "Galaxy M20": 2019,
  "Galaxy M30": 2019,
  "Galaxy M40": 2019,
  
  // 2020
  "Galaxy S20 series": 2020,
  "Galaxy Note 20 series": 2020,
  "Galaxy Z Flip": 2020,
  "Galaxy Z Fold 2": 2020,
  "Galaxy A01": 2020,
  "Galaxy A11": 2020,
  "Galaxy A21": 2020,
  "Galaxy A31": 2020,
  "Galaxy A51": 2020,
  "Galaxy A71": 2020,
  "Galaxy M11": 2020,
  "Galaxy M21": 2020,
  "Galaxy M31": 2020,
  "Galaxy M51": 2020,
  
  // 2021
  "Galaxy S21 series": 2021,
  "Galaxy Z Fold 3": 2021,
  "Galaxy Z Flip 3": 2021,
  "Galaxy A02": 2021,
  "Galaxy A12": 2021,
  "Galaxy A22": 2021,
  "Galaxy A32": 2021,
  "Galaxy A52": 2021,
  "Galaxy A72": 2021,
  "Galaxy M12": 2021,
  "Galaxy M32": 2021,
  "Galaxy M42": 2021,
  "Galaxy M52": 2021,
  "Galaxy M62": 2021,
  
  // 2022
  "Galaxy S22 series": 2022,
  "Galaxy Z Fold 4": 2022,
  "Galaxy Z Flip 4": 2022,
  "Galaxy A03": 2022,
  "Galaxy A13": 2022,
  "Galaxy A23": 2022,
  "Galaxy A33": 2022,
  "Galaxy A53": 2022,
  "Galaxy A73": 2022,
  "Galaxy M13": 2022,
  "Galaxy M23": 2022,
  "Galaxy M33": 2022,
  "Galaxy M53": 2022,
  
  // 2023
  "Galaxy S23 series": 2023,
  "Galaxy Z Fold 5": 2023,
  "Galaxy Z Flip 5": 2023,
  "Galaxy A04": 2023,
  "Galaxy A14": 2023,
  "Galaxy A24": 2023,
  "Galaxy A34": 2023,
  "Galaxy A54": 2023,
  "Galaxy M14": 2023,
  "Galaxy M34": 2023,
  "Galaxy M54": 2023,
  
  // 2024
  "Galaxy S24 series": 2024,
  "Galaxy Z Fold 6": 2024,
  "Galaxy Z Flip 6": 2024,
  "Galaxy A05": 2024,
  "Galaxy A15": 2024,
  "Galaxy A25": 2024,
  "Galaxy A35": 2024,
  "Galaxy A55": 2024,
  "Galaxy M15": 2024,
  "Galaxy M35": 2024,
  "Galaxy M55": 2024,
  "Galaxy F15": 2024,
  "Galaxy F35": 2024,
  "Galaxy F55": 2024,
  
  // 2025
  "Galaxy S25 series": 2025,
  "Galaxy Z Fold 7": 2025,
  "Galaxy Z Flip 7": 2025,
  "Galaxy A16": 2025,
  "Galaxy A36": 2025,
  "Galaxy A56": 2025
};

// Function to add a new trending wallpaper
export const addTrendingWallpaper = async (wallpaper) => {
  try {
    // If no subcategory is selected but a main category is, set subcategory to "None"
    if (wallpaper.category && !wallpaper.subCategory) {
      wallpaper.subCategory = "None";
    }
    
    const docRef = await addDoc(trendingWallpapersRef, {
      ...wallpaper,
      timestamp: serverTimestamp(),
      downloads: 0,
      views: 0
    });
    console.log("Trending wallpaper added with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error adding trending wallpaper: ", error);
    throw error;
  }
};

// Function to add a new trending wallpaper with a specific ID
export const addTrendingWallpaperWithId = async (id: string, wallpaper) => {
  try {
    // If no subcategory is selected but a main category is, set subcategory to "None"
    if (wallpaper.category && !wallpaper.subCategory) {
      wallpaper.subCategory = "None";
    }
    
    await setDoc(doc(db, "TrendingWallpapers", id), {
      ...wallpaper,
      timestamp: serverTimestamp(),
      downloads: 0,
      views: 0
    });
    console.log("Trending wallpaper added with ID: ", id);
    return id;
  } catch (error) {
    console.error("Error adding trending wallpaper: ", error);
    throw error;
  }
};

// Function to add a new brand wallpaper
export const addBrandWallpaper = async (brand, wallpaper) => {
  try {
    // If no subcategory is selected but a main category is, set subcategory to "None"
    if (wallpaper.category && !wallpaper.subCategory) {
      wallpaper.subCategory = "None";
    }
    
    const brandRef = collection(db, brand);
    const docRef = await addDoc(brandRef, {
      ...wallpaper,
      timestamp: serverTimestamp(),
      downloads: 0,
      views: 0
    });
    console.log(`${brand} wallpaper added with ID: `, docRef.id);
    return docRef.id;
  } catch (error) {
    console.error(`Error adding ${brand} wallpaper: `, error);
    throw error;
  }
};

// Function to add a new brand wallpaper with a specific ID
export const addBrandWallpaperWithId = async (brand, id, wallpaper) => {
  try {
    // If no subcategory is selected but a main category is, set subcategory to "None"
    if (wallpaper.category && !wallpaper.subCategory) {
      wallpaper.subCategory = "None";
    }
    
    // Convert launchYear to number for Samsung, Apple, and OnePlus
    const finalWallpaper = { ...wallpaper };
    if ((brand === 'Samsung' || brand === 'Apple' || brand === 'OnePlus' || brand === 'Xiaomi') && finalWallpaper.launchYear) {
      finalWallpaper.launchYear = Number(finalWallpaper.launchYear);
    }
    
    await setDoc(doc(db, brand, id), {
      ...finalWallpaper,
      timestamp: serverTimestamp(),
      downloads: 0,
      views: 0
    });
    console.log(`${brand} wallpaper added with ID: `, id);
    return id;
  } catch (error) {
    console.error(`Error adding ${brand} wallpaper: `, error);
    throw error;
  }
};

// Function to add a new banner
export const addBanner = async (banner) => {
  try {
    const docRef = await addDoc(bannersRef, banner);
    console.log("Banner added with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error adding banner: ", error);
    throw error;
  }
};

// Function to add a new banner with a specific ID
export const addBannerWithId = async (id, banner) => {
  try {
    await setDoc(doc(db, "Banners", id), banner);
    console.log("Banner added with ID: ", id);
    return id;
  } catch (error) {
    console.error("Error adding banner: ", error);
    throw error;
  }
};

// Function to add app-specific banner with nested structure
// Structure: Banners/{auto-id}/{appName}/{wallpaperId}
export const addAppBannerWithWallpaperId = async (appName: string, wallpaperId: string, bannerData: any) => {
  try {
    // Create a new banner document with auto-generated ID
    const bannerDocRef = doc(collection(db, "Banners"));
    
    // Create the app subcollection document with wallpaper ID
    const appBannerRef = doc(collection(bannerDocRef, appName), wallpaperId);
    
    await setDoc(appBannerRef, {
      ...bannerData,
      timestamp: serverTimestamp()
    });
    
    console.log(`App banner added - Banner ID: ${bannerDocRef.id}, App: ${appName}, Wallpaper ID: ${wallpaperId}`);
    return {
      bannerId: bannerDocRef.id,
      appName,
      wallpaperId
    };
  } catch (error) {
    console.error("Error adding app banner: ", error);
    throw error;
  }
};

// Function to add banner to multiple apps with fixed document structure
// Structure: Banners/{AppName}Wallpapers/{AppName}/{wallpaper-id}
export const addBannerToMultipleApps = async (appNames: string[], wallpaperId: string, bannerData: any) => {
  try {
    const promises = appNames.map(appName => {
      // Use fixed document name: {AppName}Wallpapers
      const fixedDocName = `${appName}Wallpapers`;
      const bannerDocRef = doc(db, "Banners", fixedDocName);
      
      // Create subcollection under the fixed document: {AppName}Wallpapers/{AppName}/{wallpaper-id}
      const appBannerRef = doc(collection(bannerDocRef, appName), wallpaperId);
      return setDoc(appBannerRef, {
        ...bannerData,
        timestamp: serverTimestamp()
      });
    });
    
    await Promise.all(promises);
    
    const fixedDocNames = appNames.map(appName => `${appName}Wallpapers`);
    console.log(`Banner added to multiple apps - Fixed Doc Names: ${fixedDocNames.join(', ')}, Apps: ${appNames.join(', ')}, Wallpaper ID: ${wallpaperId}`);
    return {
      fixedDocNames,
      appNames,
      wallpaperId
    };
  } catch (error) {
    console.error("Error adding banner to multiple apps: ", error);
    throw error;
  }
};

// Function to add banner with custom brand app and subcollection naming
// Structure: Banners/{BrandApp}/{CustomSubcollection}/{wallpaper-id}
export const addBannerWithCustomStructure = async (
  brandApp: string,
  subcollectionName: string,
  wallpaperId: string,
  bannerData: any
) => {
  try {
    // Create the banner document in the custom structure
    const bannerDocRef = doc(db, "Banners", brandApp);
    const subcollectionRef = doc(collection(bannerDocRef, subcollectionName), wallpaperId);

    await setDoc(subcollectionRef, {
      ...bannerData,
      timestamp: serverTimestamp()
    });

    // Update the main brand app document to track this subcollection
    await updateBrandAppSubcollections(brandApp, subcollectionName);

    console.log(`Custom banner added - Brand App: ${brandApp}, Subcollection: ${subcollectionName}, Wallpaper ID: ${wallpaperId}`);
    return {
      brandApp,
      subcollectionName,
      wallpaperId
    };
  } catch (error) {
    console.error("Error adding custom banner: ", error);
    throw error;
  }
};

// Function to update the brand app document with subcollection metadata
export const updateBrandAppSubcollections = async (brandApp: string, subcollectionName: string) => {
  try {
    const bannerDocRef = doc(db, "Banners", brandApp);
    const bannerDocSnapshot = await getDoc(bannerDocRef);

    let existingSubcollections: string[] = [];

    if (bannerDocSnapshot.exists()) {
      const data = bannerDocSnapshot.data();
      if (data && data.subcollections && Array.isArray(data.subcollections)) {
        existingSubcollections = data.subcollections;
      }
    }

    // Add the new subcollection if it doesn't exist
    if (!existingSubcollections.includes(subcollectionName)) {
      existingSubcollections.push(subcollectionName);

      await setDoc(bannerDocRef, {
        subcollections: existingSubcollections,
        lastUpdated: serverTimestamp()
      }, { merge: true });

      console.log(`Updated ${brandApp} subcollections:`, existingSubcollections);
    }
  } catch (error) {
    console.error("Error updating brand app subcollections: ", error);
    // Don't throw error here as it's not critical for banner creation
  }
};

// Function to get existing subcollections for a brand app in banner structure
// Returns list of subcollection names that already exist
export const getExistingBannerSubcollections = async (brandApp: string): Promise<string[]> => {
  try {
    // Reference to the brand app document in Banners collection
    const bannerDocRef = doc(db, "Banners", brandApp);

    // Check if the main document exists
    const bannerDocSnapshot = await getDoc(bannerDocRef);
    if (!bannerDocSnapshot.exists()) {
      console.log(`No banner document found for brand app: ${brandApp}`);
      return [];
    }

    // Try to get metadata about existing subcollections
    const data = bannerDocSnapshot.data();
    if (data && data.subcollections && Array.isArray(data.subcollections)) {
      console.log(`Found ${data.subcollections.length} tracked subcollections for ${brandApp}:`, data.subcollections);
      return data.subcollections;
    }

    // Fallback: Try common subcollection names based on brand
    const commonSubcollections = getDefaultSubcollectionSuggestions(brandApp);
    const existingSubcollections: string[] = [];

    // Check if these common subcollections exist by trying to read them
    for (const subcollectionName of commonSubcollections) {
      try {
        const subcollectionRef = collection(bannerDocRef, subcollectionName);
        const subcollectionSnapshot = await getDocs(query(subcollectionRef, limit(1)));

        if (!subcollectionSnapshot.empty) {
          existingSubcollections.push(subcollectionName);
        }
      } catch (error) {
        // Ignore errors for non-existent subcollections
        console.log(`Subcollection ${subcollectionName} does not exist or is empty`);
      }
    }

    console.log(`Found ${existingSubcollections.length} existing subcollections for ${brandApp}:`, existingSubcollections);
    return existingSubcollections;

  } catch (error) {
    console.error("Error getting existing banner subcollections: ", error);
    return [];
  }
};

// Helper function to get default subcollection suggestions (moved from BannerAppSelector)
export const getDefaultSubcollectionSuggestions = (brandApp: string): string[] => {
  switch (brandApp) {
    case 'SamsungWallpapers':
      return ['SamsungGalaxyBanners', 'SamsungNoteBanners', 'SamsungFoldBanners'];
    case 'OnePlusWallpapers':
      return ['OnePlus7Banners', 'OnePlus8Banners', 'OnePlus9Banners', 'OnePlus10Banners'];
    case 'XiaomiWallpapers':
      return ['XiaomiMiBanners', 'XiaomiCiviBanners', 'XiaomiMixBanners'];
    case 'AppleWallpapers':
      return ['iPhone14Banners', 'iPhone15Banners', 'iPhone16Banners', 'iPhone17Banners'];
    default:
      return ['AppBanners', 'CustomBanners'];
  }
};

// Function to get all banners for a specific app with fixed document structure
export const getAppBanners = async (appName: string) => {
  try {
    const appBanners = [];
    
    // Use fixed document name: {AppName}Wallpapers
    const fixedDocName = `${appName}Wallpapers`;
    const bannerDocRef = doc(db, "Banners", fixedDocName);
    
    // Get the app subcollection: Banners/{AppName}Wallpapers/{AppName}/
    const appSubcollectionRef = collection(bannerDocRef, appName);
    const appBannersSnapshot = await getDocs(appSubcollectionRef);
    
    appBannersSnapshot.forEach(appBannerDoc => {
      appBanners.push({
        fixedDocName,
        wallpaperId: appBannerDoc.id,
        appName,
        data: appBannerDoc.data()
      });
    });
    
    console.log(`Retrieved ${appBanners.length} banners for app: ${appName} from ${fixedDocName}`);
    return appBanners;
  } catch (error) {
    console.error(`Error getting banners for app ${appName}:`, error);
    throw error;
  }
};

// Function to get banner by app and wallpaper ID
export const getBannerByAppAndWallpaperId = async (appName: string, wallpaperId: string) => {
  try {
    // Use fixed document structure: Banners/{AppName}Wallpapers/{AppName}/{wallpaper-id}
    const fixedDocName = `${appName}Wallpapers`;
    const bannerDocRef = doc(db, "Banners", fixedDocName);
    const appBannerRef = doc(collection(bannerDocRef, appName), wallpaperId);
    const appBannerDoc = await getDoc(appBannerRef);
    
    if (appBannerDoc.exists()) {
      return {
        bannerId: fixedDocName,
        wallpaperId: appBannerDoc.id,
        appName,
        data: appBannerDoc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting banner for app ${appName} and wallpaper ${wallpaperId}:`, error);
    throw error;
  }
};

// Function to delete banner from specific app
export const deleteBannerFromApp = async (appName: string, wallpaperId: string) => {
  try {
    // Use fixed document structure: Banners/{AppName}Wallpapers/{AppName}/{wallpaper-id}
    const fixedDocName = `${appName}Wallpapers`;
    const bannerDocRef = doc(db, "Banners", fixedDocName);
    const appBannerRef = doc(collection(bannerDocRef, appName), wallpaperId);
    await deleteDoc(appBannerRef);
    
    console.log(`Banner deleted from app - Fixed Doc: ${fixedDocName}, App: ${appName}, Wallpaper ID: ${wallpaperId}`);
    return true;
  } catch (error) {
    console.error("Error deleting banner from app: ", error);
    throw error;
  }
};

// Function to get all banners with their associated apps
export const getAllBannersWithApps = async () => {
  try {
    const allBanners = [];
    
    // Get banners from fixed document structure: Banners/{AppName}Wallpapers
    const commonApps = ['iPhone17', 'Samsung', 'OnePlus', 'General'];
    
    for (const appName of commonApps) {
      const fixedDocName = `${appName}Wallpapers`;
      const bannerDocRef = doc(db, "Banners", fixedDocName);
      const appSubcollectionRef = collection(bannerDocRef, appName);
      
      try {
        const appBannersSnapshot = await getDocs(appSubcollectionRef);
        
        if (!appBannersSnapshot.empty) {
          const bannerData = {
            bannerId: fixedDocName,
            apps: {
              [appName]: []
            }
          };
          
          appBannersSnapshot.forEach(appBannerDoc => {
            bannerData.apps[appName].push({
              wallpaperId: appBannerDoc.id,
              data: appBannerDoc.data()
            });
          });
          
          allBanners.push(bannerData);
        }
      } catch (error) {
        console.log(`No banners found for ${appName}, skipping...`);
      }
    }
    
    console.log(`Retrieved ${allBanners.length} banner documents with their apps`);
    return allBanners;
  } catch (error) {
    console.error("Error getting all banners with apps: ", error);
    throw error;
  }
};

// Function to migrate existing banners to new nested structure
export const migrateBannersToNestedStructure = async () => {
  try {
    console.log('Starting banner migration to nested structure...');
    
    // Get all existing banners
    const bannersSnapshot = await getDocs(collection(db, "Banners"));
    const migrationResults = [];
    
    for (const bannerDoc of bannersSnapshot.docs) {
      const bannerData = bannerDoc.data();
      const oldBannerId = bannerDoc.id;
      
      // Check if this is already in nested structure (has subcollections)
      // If it has bannerName and bannerUrl directly, it's old structure
      if (bannerData.bannerName && bannerData.bannerUrl) {
        console.log(`Migrating banner: ${oldBannerId}`);
        
        // Create new nested structure in General app
        const result = await addAppBannerWithWallpaperId('General', oldBannerId, {
          bannerName: bannerData.bannerName,
          bannerUrl: bannerData.bannerUrl
        });
        
        // Delete old banner document
        await deleteDoc(doc(db, "Banners", oldBannerId));
        
        migrationResults.push({
          oldId: oldBannerId,
          newStructure: result,
          status: 'migrated'
        });
        
        console.log(`Migrated banner ${oldBannerId} to nested structure`);
      } else {
        migrationResults.push({
          oldId: oldBannerId,
          status: 'already_nested'
        });
      }
    }
    
    console.log(`Migration completed. Results:`, migrationResults);
    return migrationResults;
  } catch (error) {
    console.error("Error migrating banners: ", error);
    throw error;
  }
};

// Function to get banner by wallpaper URL (updated for nested structure)
export const getBannerByWallpaperUrlNested = async (imageUrl: string, appName?: string) => {
  try {
    // Transform the URL to match the banner URL format (with 'h' before extension)
    const getUrlWithH = (url) => {
      const lastDotIndex = url.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        return `${url.substring(0, lastDotIndex)}h${url.substring(lastDotIndex)}`;
      }
      return url;
    };
    
    const bannerUrl = getUrlWithH(imageUrl);
    
    // Get all banner documents
    const bannersSnapshot = await getDocs(collection(db, "Banners"));
    
    // Search through all banner documents and their app subcollections
    for (const bannerDoc of bannersSnapshot.docs) {
      const appsToCheck = appName ? [appName] : ['iPhone17', 'Samsung', 'OnePlus', 'General'];
      
      for (const app of appsToCheck) {
        const appSubcollectionRef = collection(bannerDoc.ref, app);
        const appBannersSnapshot = await getDocs(appSubcollectionRef);
        
        for (const appBannerDoc of appBannersSnapshot.docs) {
          const bannerData = appBannerDoc.data();
          if (bannerData.bannerUrl === bannerUrl) {
            return {
              bannerId: bannerDoc.id,
              wallpaperId: appBannerDoc.id,
              appName: app,
              data: bannerData
            };
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error getting banner by URL (nested): ", error);
    throw error;
  }
};

// Function to add a new category
export const addCategory = async (category) => {
  try {
    const categoryData: any = {
      categoryType: category.categoryType,
      thumbnail: category.thumbnail
    };
    
    // Add subcategories if this is a main category with subcategories
    if (category.categoryType === 'main' && mainCategories[category.categoryName]) {
      categoryData.subcategories = mainCategories[category.categoryName];
    }
    
    await setDoc(doc(categoriesRef, category.categoryName), categoryData);
    console.log("Category added: ", category.categoryName);
    return category.categoryName;
  } catch (error) {
    console.error("Error adding category: ", error);
    throw error;
  }
};

// Function to update a wallpaper
export const updateWallpaper = async (collectionName: string, id: string, data: any) => {
  try {
    // If no subcategory is selected but a main category is, set subcategory to "None"
    if (data.category && !data.subCategory) {
      data.subCategory = "None";
    }
    
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, data, { merge: true });
    console.log(`${collectionName} wallpaper updated with ID: `, id);
    return id;
  } catch (error) {
    console.error(`Error updating ${collectionName} wallpaper: `, error);
    throw error;
  }
};

// Function to delete a wallpaper
export const deleteWallpaper = async (collectionName: string, id: string) => {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    console.log(`${collectionName} wallpaper deleted with ID: `, id);
    return id;
  } catch (error) {
    console.error(`Error deleting ${collectionName} wallpaper: `, error);
    throw error;
  }
};

// Function to delete all wallpapers in a category
export const deleteWallpapersByCategory = async (collectionName: string, categoryName: string) => {
  try {
    let wallpapers;
    let wallpapersToDelete;
    
    if (collectionName === 'Samsung') {
      wallpapers = await getAllWallpapersForBrand(collectionName);
      wallpapersToDelete = wallpapers.filter(wallpaper => 
        wallpaper.data.series === categoryName
      );
    } else if (collectionName === 'TrendingWallpapers') {
      wallpapers = await getAllTrendingWallpapers();
      wallpapersToDelete = wallpapers.filter(wallpaper => 
        wallpaper.data.category === categoryName
      );
    } else {
      throw new Error(`Unsupported collection: ${collectionName}`);
    }
    
    const deletePromises = wallpapersToDelete.map(wallpaper => 
      deleteWallpaper(collectionName, wallpaper.id)
    );
    
    await Promise.all(deletePromises);
    console.log(`All wallpapers in category ${categoryName} deleted from ${collectionName}`);
    return wallpapersToDelete.length;
  } catch (error) {
    console.error(`Error deleting wallpapers in category ${categoryName}:`, error);
    throw error;
  }
};

// Function to get all categories
export const getCategories = async () => {
  try {
    const querySnapshot = await getDocs(categoriesRef);
    const categories = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      categories.push({
        categoryName: doc.id,
        categoryType: data.categoryType,
        thumbnail: data.thumbnail
      });
    });
    return categories;
  } catch (error) {
    console.error("Error getting categories: ", error);
    throw error;
  }
};

// Function to get devices for a specific brand
export const getDevices = async (brand) => {
  try {
    const docRef = doc(devicesRef, brand);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.log("No devices found for brand: ", brand);
      return {
        devices: []
      };
    }
  } catch (error) {
    console.error("Error getting devices: ", error);
    throw error;
  }
};

// Function to get all devices from all brands
export const getAllDevices = async () => {
  try {
    const snapshot = await getDocs(devicesRef);
    const allDevices: { [key: string]: Device & { name: string } } = {};
    
    snapshot.forEach((doc) => {
      const deviceData = doc.data() as Device;
      allDevices[doc.id] = {
        ...deviceData,
        name: doc.id // Add the document ID as the brand name
      };
    });
    
    return allDevices;
  } catch (error) {
    console.error('Error getting all devices:', error);
    return {};
  }
};

// Function to check if a wallpaper with a given URL already exists
export const checkDuplicateWallpaper = async (imageUrl) => {
  try {
    // Check in TrendingWallpapers
    const trendingQuery = query(trendingWallpapersRef, where("imageUrl", "==", imageUrl));
    const trendingSnapshot = await getDocs(trendingQuery);
    
    if (!trendingSnapshot.empty) {
      return true;
    }
    
    // Check in brand collections
    const brandCategories = (await getCategories()).filter(cat => cat.categoryType === 'brand');
    
    for (const category of brandCategories) {
      const brand = category.categoryName;
      const brandRef = collection(db, brand);
      const brandQuery = query(brandRef, where("imageUrl", "==", imageUrl));
      const brandSnapshot = await getDocs(brandQuery);
      
      if (!brandSnapshot.empty) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error checking duplicate wallpaper: ", error);
    throw error;
  }
};

// Function to get wallpaper ID by URL
export const getWallpaperIdByUrl = async (imageUrl) => {
  try {
    const results = [];
    
    // Check TrendingWallpapers
    const trendingQuery = query(trendingWallpapersRef, where("imageUrl", "==", imageUrl));
    const trendingSnapshot = await getDocs(trendingQuery);
    
    trendingSnapshot.forEach(doc => {
      results.push({
        id: doc.id,
        collection: 'TrendingWallpapers',
        data: doc.data()
      });
    });
    
    // Check in brand collections
    const brandCategories = (await getCategories()).filter(cat => cat.categoryType === 'brand');
    
    for (const category of brandCategories) {
      const brand = category.categoryName;
      const brandRef = collection(db, brand);
      const brandQuery = query(brandRef, where("imageUrl", "==", imageUrl));
      const brandSnapshot = await getDocs(brandQuery);
      
      brandSnapshot.forEach(doc => {
        results.push({
          id: doc.id,
          collection: brand,
          data: doc.data()
        });
      });
    }
    
    return results;
  } catch (error) {
    console.error("Error getting wallpaper by URL: ", error);
    throw error;
  }
};

// Function to get banner by URL
export const getBannerByWallpaperUrl = async (imageUrl) => {
  try {
    // Transform the URL to match the banner URL format (with 'h' before extension)
    const getUrlWithH = (url) => {
      const lastDotIndex = url.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        return `${url.substring(0, lastDotIndex)}h${url.substring(lastDotIndex)}`;
      }
      return url;
    };
    
    const bannerUrl = getUrlWithH(imageUrl);
    
    const bannerQuery = query(bannersRef, where("bannerUrl", "==", bannerUrl));
    const bannerSnapshot = await getDocs(bannerQuery);
    
    if (bannerSnapshot.empty) {
      return null;
    }
    
    const bannerDoc = bannerSnapshot.docs[0];
    return {
      id: bannerDoc.id,
      data: bannerDoc.data()
    };
  } catch (error) {
    console.error("Error getting banner by URL: ", error);
    throw error;
  }
};

// Function to remove wallpaper and related items
export const removeWallpaper = async (imageUrl) => {
  try {
    const removedItems = [];
    
    // Get all wallpapers with this URL
    const wallpapers = await getWallpaperIdByUrl(imageUrl);
    
    // Delete each wallpaper
    for (const wallpaper of wallpapers) {
      if (wallpaper.collection === 'TrendingWallpapers') {
        await deleteDoc(doc(db, "TrendingWallpapers", wallpaper.id));
        removedItems.push(`Trending: ${wallpaper.id}`);
      } else {
        // wallpaper.collection is the brand name
        await deleteDoc(doc(db, wallpaper.collection, wallpaper.id));
        removedItems.push(`${wallpaper.collection}: ${wallpaper.id}`);
      }
    }
    
    // Check for banner
    const banner = await getBannerByWallpaperUrl(imageUrl);
    if (banner) {
      await deleteDoc(doc(db, "Banners", banner.id));
      removedItems.push(`Banner: ${banner.id}`);
    }
    
    return removedItems;
  } catch (error) {
    console.error("Error removing wallpaper: ", error);
    throw error;
  }
};

// Function to get all trending wallpapers
export const getAllTrendingWallpapers = async () => {
  try {
    const snapshot = await getDocs(trendingWallpapersRef);
    const wallpapers = [];
    
    snapshot.forEach(doc => {
      wallpapers.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    return wallpapers;
  } catch (error) {
    console.error("Error getting trending wallpapers: ", error);
    throw error;
  }
};

// Function to get all brand categories
export const getBrandCategories = async () => {
  try {
    const categories = await getCategories();
    return categories
      .filter(cat => cat.categoryType === 'brand')
      .map(cat => cat.categoryName);
  } catch (error) {
    console.error("Error getting brand categories: ", error);
    throw error;
  }
};

// Function to get all device series for a brand
export const getBrandDevices = async (brand) => {
  try {
    const deviceData = await getDevices(brand);
    if (!deviceData || !deviceData.devices) {
      return [];
    }
    return deviceData.devices;
  } catch (error) {
    console.error("Error getting brand devices: ", error);
    throw error;
  }
};

// Function to get all wallpapers for a specific brand
export const getAllWallpapersForBrand = async (brand) => {
  try {
    const brandRef = collection(db, brand);
    const snapshot = await getDocs(brandRef);
    const wallpapers = [];
    
    snapshot.forEach(doc => {
      wallpapers.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    return wallpapers;
  } catch (error) {
    console.error(`Error getting wallpapers for ${brand}: `, error);
    throw error;
  }
};

// Function to get all wallpapers for a specific brand and device series
export const getAllWallpapersForBrandDevice = async (brand: string, deviceSeries: string) => {
  try {
    const brandRef = collection(db, brand);
    const deviceQuery = query(brandRef, where("series", "==", deviceSeries));
    const snapshot = await getDocs(deviceQuery);
    const wallpapers = [];
    
    snapshot.forEach(doc => {
      wallpapers.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    return wallpapers;
  } catch (error) {
    console.error(`Error getting wallpapers for ${brand} ${deviceSeries}: `, error);
    throw error;
  }
};

// Function to get analytics data
export const getAnalyticsData = async () => {
  try {
    // Get total wallpapers
    const trendingSnapshot = await getDocs(trendingWallpapersRef);
    let totalWallpapers = trendingSnapshot.size;
    const trendingWallpapers = trendingSnapshot.size;
    
    // Get brand wallpapers
    const brandCategories = (await getCategories()).filter((cat) => cat.categoryType === "brand");
    const brandWallpapers = {};
    
    for (const brand of brandCategories.map((cat) => cat.categoryName)) {
      try {
        const brandRef = collection(db, brand);
        const brandSnapshot = await getDocs(brandRef);
        totalWallpapers += brandSnapshot.size;
        brandWallpapers[brand] = brandSnapshot.size;
      } catch (error) {
        console.error(`Error getting ${brand} wallpapers:`, error);
        brandWallpapers[brand] = 0;
      }
    }
    
    // Get categories count
    const categoriesSnapshot = await getDocs(categoriesRef);
    const totalCategories = categoriesSnapshot.size;
    
    // Get total downloads (sum of all downloads)
    let totalDownloads = 0;
    trendingSnapshot.forEach((doc) => {
      const data = doc.data();
      totalDownloads += data.downloads || 0;
    });
    
    // Count download numbers from brand collections as well
    for (const brand of brandCategories.map((cat) => cat.categoryName)) {
      try {
        const brandRef = collection(db, brand);
        const brandSnapshot = await getDocs(brandRef);
        brandSnapshot.forEach((doc) => {
          const data = doc.data();
          totalDownloads += data.downloads || 0;
        });
      } catch (error) {
        console.error(`Error getting ${brand} download counts:`, error);
      }
    }
    
    // Use placeholder values for active users and tags for now
    const activeUsers = 1420; // Placeholder value for now
    const totalTags = 96; // Placeholder value for now
    
    return {
      activeUsers,
      totalDownloads,
      totalWallpapers,
      totalCategories,
      totalTags,
      trendingWallpapers,
      brandWallpapers
    };
  } catch (error) {
    console.error("Error getting analytics data: ", error);
    // Return default values if there's an error
    return {
      activeUsers: 0,
      totalDownloads: 0,
      totalWallpapers: 0,
      totalCategories: 0,
      totalTags: 0,
      trendingWallpapers: 0,
      brandWallpapers: {}
    };
  }
};

// Function to get subcategories for a main category
export const getSubcategories = async (categoryName: string) => {
  try {
    const docRef = doc(categoriesRef, categoryName);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.subcategories || [];
    }
    
    // If not in database, check predefined list
    return mainCategories[categoryName] || [];
  } catch (error) {
    console.error("Error getting subcategories: ", error);
    throw error;
  }
};

// Function to update devices for a brand (append instead of overwrite)
export const updateDevices = async (brand: string, newDevices: string[], iosVersions?: string[]) => {
  try {
    const docRef = doc(devicesRef, brand);
    const docSnap = await getDoc(docRef);
    
    let existingDevices: string[] = [];
    let existingIosVersions: string[] = [];
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      existingDevices = data.devices || [];
      existingIosVersions = data.iosVersions || [];
    }
    
    // Merge devices (avoid duplicates)
    const mergedDevices = [...new Set([...existingDevices, ...newDevices])];
    
    const updateData: any = {
      devices: mergedDevices
    };
    
    // Merge iOS versions if provided
    if (iosVersions && iosVersions.length > 0) {
      const mergedIosVersions = [...new Set([...existingIosVersions, ...iosVersions])];
      updateData.iosVersions = mergedIosVersions;
    } else if (existingIosVersions.length > 0) {
      updateData.iosVersions = existingIosVersions;
    }
    
    await setDoc(docRef, updateData);
    console.log(`Devices updated for ${brand}:`, updateData);
    return updateData;
  } catch (error) {
    console.error(`Error updating devices for ${brand}:`, error);
    throw error;
  }
};

// Function to initialize Samsung devices from the predefined list
export const initializeSamsungDevices = async () => {
  try {
    // Remove duplicates from the Samsung device models
    const uniqueSamsungDevices = [...new Set(samsungDeviceModels)];
    
    await setDoc(doc(devicesRef, 'Samsung'), {
      devices: uniqueSamsungDevices
    });
    
    console.log('Samsung devices initialized successfully');
    return uniqueSamsungDevices;
  } catch (error) {
    console.error('Error initializing Samsung devices:', error);
    throw error;
  }
};

// Function to initialize iPhone devices from the predefined list
export const initializeIphoneDevices = async () => {
  try {
    // Remove duplicates from the iPhone device models
    const uniqueIphoneDevices = [...new Set(iphoneDeviceModels)];
    
    await setDoc(doc(devicesRef, 'Apple'), {
      devices: uniqueIphoneDevices
    });
    
    console.log('iPhone devices initialized successfully');
    return uniqueIphoneDevices;
  } catch (error) {
    console.error('Error initializing iPhone devices:', error);
    throw error;
  }
};

// Function to initialize OnePlus devices from the predefined list
export const initializeOneplusDevices = async () => {
  try {
    // Remove duplicates from the OnePlus device models
    const uniqueOneplusDevices = [...new Set(oneplusDeviceModels)];
    
    await setDoc(doc(devicesRef, 'OnePlus'), {
      devices: uniqueOneplusDevices
    });
    
    console.log('OnePlus devices initialized successfully');
    return uniqueOneplusDevices;
  } catch (error) {
    console.error('Error initializing OnePlus devices:', error);
    throw error;
  }
};

// Function to initialize Xiaomi devices from the predefined list
export const initializeXiaomiDevices = async () => {
  try {
    // Remove duplicates from the Xiaomi device models
    const uniqueXiaomiDevices = [...new Set(xiaomiDeviceModels)];

    await setDoc(doc(devicesRef, 'Xiaomi'), {
      devices: uniqueXiaomiDevices
    });

    console.log('Xiaomi devices initialized successfully');
    return uniqueXiaomiDevices;
  } catch (error) {
    console.error('Error initializing Xiaomi devices:', error);
    throw error;
  }
};

// Function to initialize iOS versions for Apple devices (preserves existing devices array)
export const initializeIosVersions = async () => {
  try {
    // Get existing Apple device data
    const docRef = doc(devicesRef, 'Apple');
    const docSnap = await getDoc(docRef);
    
    let existingDevices: string[] = [];
    if (docSnap.exists()) {
      const data = docSnap.data();
      existingDevices = data.devices || [];
    }
    
    // Set both devices and iosVersions arrays
    await setDoc(doc(devicesRef, 'Apple'), {
      devices: existingDevices.length > 0 ? existingDevices : [...new Set(iphoneDeviceModels)],
      iosVersions: [...new Set(iosVersions)]
    });
    
    console.log('iOS versions initialized successfully for Apple');
    return iosVersions;
  } catch (error) {
    console.error('Error initializing iOS versions:', error);
    throw error;
  }
};

// Function to get all trending wallpapers
export const getTrendingWallpapers = async () => {
  try {
    const querySnapshot = await getDocs(trendingWallpapersRef);
    const wallpapers = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`Retrieved ${wallpapers.length} trending wallpapers`);
    return wallpapers;
  } catch (error) {
    console.error('Error getting trending wallpapers:', error);
    throw error;
  }
};

// Function to get all Samsung wallpapers
export const getSamsungWallpapers = async () => {
  try {
    const samsungRef = collection(db, "Samsung");
    const querySnapshot = await getDocs(samsungRef);
    const wallpapers = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`Retrieved ${wallpapers.length} Samsung wallpapers`);
    return wallpapers;
  } catch (error) {
    console.error('Error getting Samsung wallpapers:', error);
    throw error;
  }
};

// Function to update a wallpaper in a specific collection (alias for updateWallpaper)
export const updateWallpaperInCollection = async (collectionName: string, id: string, data: any) => {
  return updateWallpaper(collectionName, id, data);
};

// ─── App Promos ───────────────────────────────────────────────────────────────

export interface AppPromo {
  id: string;
  appName: string;
  appUrl: string;
  imageUrl: string;
  createdAt?: any;
}

/** Save a new app promo: AppPromos/{appName} */
export const addAppPromo = async (data: {
  appName: string;
  appUrl: string;
  imageUrl: string;
}): Promise<string> => {
  try {
    const ref = doc(collection(db, 'AppPromos'));
    await setDoc(ref, {
      appName: data.appName,
      appUrl: data.appUrl,
      imageUrl: data.imageUrl,
      createdAt: serverTimestamp(),
    });
    console.log('App promo created:', ref.id);
    return ref.id;
  } catch (error) {
    console.error('Error adding app promo:', error);
    throw error;
  }
};

/** Fetch all app promos from AppPromos collection */
export const getAppPromos = async (): Promise<AppPromo[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'AppPromos'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppPromo));
  } catch (error) {
    console.error('Error getting app promos:', error);
    throw error;
  }
};

/** Delete an app promo document */
export const deleteAppPromo = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'AppPromos', id));
    console.log('App promo deleted:', id);
  } catch (error) {
    console.error('Error deleting app promo:', error);
    throw error;
  }
};

/** Fetch all banner docs inside Banners/{brandApp}/{subcollection} */
export const getBannersByBrandAndSubcollection = async (
  brandApp: string,
  subcollection: string
): Promise<Array<{ id: string; [key: string]: any }>> => {
  try {
    const ref = collection(doc(db, 'Banners', brandApp), subcollection);
    const snapshot = await getDocs(ref);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting banners:', error);
    throw error;
  }
};

/** Attach an app promo into Banners/{brandApp}/{subcollection}/{id} */
export const attachAppPromoToBanner = async (
  brandApp: string,
  subcollection: string,
  promoId: string,
  bannerData: { bannerName: string; bannerUrl: string; imageUrl: string; bannerType: string }
): Promise<void> => {
  try {
    const ref = doc(collection(doc(db, 'Banners', brandApp), subcollection), promoId);
    await setDoc(ref, { ...bannerData, timestamp: serverTimestamp() });
    await updateBrandAppSubcollections(brandApp, subcollection);
    console.log(`Attached promo ${promoId} to Banners/${brandApp}/${subcollection}`);
  } catch (error) {
    console.error('Error attaching app promo to banner:', error);
    throw error;
  }
};

/** Delete a single document from Banners/{brandApp}/{subcollection}/{id} */
export const deleteBannerDoc = async (
  brandApp: string,
  subcollection: string,
  docId: string
): Promise<void> => {
  try {
    await deleteDoc(doc(collection(doc(db, 'Banners', brandApp), subcollection), docId));
    console.log(`Deleted Banners/${brandApp}/${subcollection}/${docId}`);
  } catch (error) {
    console.error('Error deleting banner doc:', error);
    throw error;
  }
};

export { app, db, storage };
