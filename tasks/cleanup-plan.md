# Reddit Media Saver - Cleanup Plan

## 🎯 **CLEANUP OBJECTIVES**
1. Remove redundant standalone scripts
2. Consolidate functionality into proper TypeScript services
3. Keep only the most robust implementations
4. Maintain backward compatibility with npm scripts

## 📋 **FILES TO REMOVE**

### **Redundant Standalone Scripts**
- `download-all.cjs` - Functionality covered by `src/scripts/processRedditLinks.ts`
- `download-csv.cjs` - Placeholder script, not functional
- `test-download-20.cjs` - Test script, functionality covered by main script

### **Compiled Files (Auto-generated)**
- `dist-scripts/` - Entire directory (compiled from src/)
- These are auto-generated and should be removed

## 🔄 **CONSOLIDATION STRATEGY**

### **1. Keep Robust TypeScript Implementation**
- ✅ `src/scripts/processRedditLinks.ts` - Main processing script
- ✅ `src/services/contentDownloadService.ts` - Full download service
- ✅ `src/services/fileInputService.ts` - CSV processing service
- ✅ `src/utils/` - Utility functions

### **2. Update Package.json Scripts**
- Keep `process-links` script (points to TypeScript version)
- Remove any references to standalone .cjs files
- Add new scripts for different use cases

### **3. Create Enhanced Main Script**
- Enhance `src/scripts/processRedditLinks.ts` to handle all use cases
- Add command line arguments for different modes
- Add progress tracking and better error handling

## 🚀 **IMPLEMENTATION STEPS**

### **Step 1: Remove Redundant Files**
```bash
# Remove standalone scripts
rm download-all.cjs
rm download-csv.cjs  
rm test-download-20.cjs

# Remove compiled files
rm -rf dist-scripts/
```

### **Step 2: Enhance Main Script**
- Add command line argument support
- Add different modes (test, full, batch)
- Add better progress tracking
- Add configuration options

### **Step 3: Update Package.json**
- Remove references to deleted scripts
- Add new npm scripts for different use cases
- Ensure all functionality is accessible via npm scripts

### **Step 4: Create Documentation**
- Update README with new usage instructions
- Document the consolidated approach
- Add examples for different use cases

## 📊 **BENEFITS OF CLEANUP**

### **Before Cleanup**
- 4 different download scripts with similar functionality
- Duplicate CSV processing logic across files
- Mixed CommonJS and TypeScript implementations
- Confusing file structure with compiled files

### **After Cleanup**
- Single robust TypeScript implementation
- Proper service architecture
- Clear separation of concerns
- Easy to maintain and extend

## 🎯 **SUCCESS CRITERIA**
- [ ] All redundant files removed
- [ ] Single source of truth for download functionality
- [ ] All npm scripts work correctly
- [ ] Documentation updated
- [ ] No functionality lost in cleanup 