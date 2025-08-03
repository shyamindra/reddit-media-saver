import React, { useState, useMemo, useEffect } from 'react';
import type { ContentItem } from '../types';
import { MediaUtils } from '../utils/mediaUtils';
import { databaseManager } from '../services/databaseService';
import type { SearchFilters, SearchResult } from '../database';

interface ContentBrowserProps {
  items: ContentItem[];
  onDownloadRequest?: (items: ContentItem[]) => void;
}

interface FilterState {
  search: string;
  subreddit: string;
  mediaType: string;
  author: string;
  dateFrom: string;
  dateTo: string;
  minScore: string;
  tags: string[];
}

export const ContentBrowser: React.FC<ContentBrowserProps> = ({ items, onDownloadRequest }) => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    subreddit: '',
    mediaType: '',
    author: '',
    dateFrom: '',
    dateTo: '',
    minScore: '',
    tags: []
  });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [availableTags, setAvailableTags] = useState<Array<{ id: number; name: string; color: string }>>([]);
  const [searchHistory, setSearchHistory] = useState<Array<{ query: string; filters: any; results_count: number; searched_at: number }>>([]);

  const ITEMS_PER_PAGE = 20;

  // Load available tags and search history on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const tags = databaseManager.getAllTags();
        setAvailableTags(tags);
        
        const history = databaseManager.getSearchHistory(5);
        setSearchHistory(history);
      } catch (error) {
        console.error('Failed to load tags and history:', error);
      }
    };
    
    loadData();
  }, []);

  // Perform search when filters change
  useEffect(() => {
    const performSearch = async () => {
      setIsSearching(true);
      try {
        const searchFilters: SearchFilters = {};
        
        if (filters.subreddit) searchFilters.subreddit = filters.subreddit;
        if (filters.author) searchFilters.author = filters.author;
        if (filters.mediaType) searchFilters.mediaType = filters.mediaType;
        if (filters.dateFrom) searchFilters.dateFrom = new Date(filters.dateFrom).getTime() / 1000;
        if (filters.dateTo) searchFilters.dateTo = new Date(filters.dateTo).getTime() / 1000;
        if (filters.minScore) searchFilters.minScore = parseInt(filters.minScore);
        if (filters.tags.length > 0) searchFilters.tags = filters.tags;

        const result = await databaseManager.searchContent(
          filters.search,
          searchFilters,
          ITEMS_PER_PAGE,
          currentPage * ITEMS_PER_PAGE
        );

        setSearchResults(result.results);
        setTotalResults(result.total);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
        setTotalResults(0);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [filters, currentPage]);

  // Get unique values for filter dropdowns from database
  const getUniqueValues = async (field: 'subreddit' | 'author' | 'mediaType') => {
    try {
      const allResults = await databaseManager.searchContent('', {}, 1000, 0);
      const values = new Set<string>();
      
      allResults.results.forEach(result => {
        if (field === 'subreddit') values.add(result.content.subreddit);
        if (field === 'author') values.add(result.content.author);
        if (field === 'mediaType') {
          result.media.forEach(m => values.add(m.type));
        }
      });
      
      return Array.from(values).sort();
    } catch (error) {
      console.error(`Failed to get unique ${field} values:`, error);
      return [];
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(0); // Reset to first page when filters change
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === searchResults.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(searchResults.map(item => item.content.id)));
    }
  };

  const handleDownloadSelected = () => {
    const selectedContentItems = searchResults
      .filter(item => selectedItems.has(item.content.id))
      .map(item => ({
        id: item.content.id,
        type: item.content.type,
        title: item.content.title,
        subreddit: item.content.subreddit,
        author: item.content.author,
        url: item.content.url,
        permalink: item.content.permalink,
        created_utc: item.content.created_utc,
        saved: true,
        media: item.media[0] ? {
          type: item.media[0].type as any,
          url: item.media[0].url
        } : undefined,
        metadata: {
          score: item.content.score,
          num_comments: item.content.num_comments || 0,
          upvote_ratio: item.content.upvote_ratio || 0
        }
      } as ContentItem));
    
    onDownloadRequest?.(selectedContentItems);
  };

  const handleAddTag = async (contentId: string, tagName: string) => {
    try {
      databaseManager.addTagToContent(contentId, tagName);
      // Refresh search results to show updated tags
      const result = await databaseManager.searchContent(
        filters.search,
        {
          subreddit: filters.subreddit || undefined,
          author: filters.author || undefined,
          mediaType: filters.mediaType || undefined,
          dateFrom: filters.dateFrom ? new Date(filters.dateFrom).getTime() / 1000 : undefined,
          dateTo: filters.dateTo ? new Date(filters.dateTo).getTime() / 1000 : undefined,
          minScore: filters.minScore ? parseInt(filters.minScore) : undefined,
          tags: filters.tags.length > 0 ? filters.tags : undefined
        },
        ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      );
      setSearchResults(result.results);
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  };

  const handleRemoveTag = async (contentId: string, tagName: string) => {
    try {
      databaseManager.removeTagFromContent(contentId, tagName);
      // Refresh search results to show updated tags
      const result = await databaseManager.searchContent(
        filters.search,
        {
          subreddit: filters.subreddit || undefined,
          author: filters.author || undefined,
          mediaType: filters.mediaType || undefined,
          dateFrom: filters.dateFrom ? new Date(filters.dateFrom).getTime() / 1000 : undefined,
          dateTo: filters.dateTo ? new Date(filters.dateTo).getTime() / 1000 : undefined,
          minScore: filters.minScore ? parseInt(filters.minScore) : undefined,
          tags: filters.tags.length > 0 ? filters.tags : undefined
        },
        ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      );
      setSearchResults(result.results);
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  const getMediaIcon = (mediaType?: string) => {
    switch (mediaType) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      case 'gif':
        return '🎬';
      case 'text':
        return '📝';
      case 'link':
        return '🔗';
      default:
        return '📄';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saved Content</h1>
          <p className="text-gray-600">
            {isSearching ? 'Searching...' : `${totalResults} total items`}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              viewMode === 'grid'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              viewMode === 'list'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Search & Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search titles, content, subreddits..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subreddit
            </label>
            <input
              type="text"
              value={filters.subreddit}
              onChange={(e) => handleFilterChange('subreddit', e.target.value)}
              placeholder="Enter subreddit name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Author
            </label>
            <input
              type="text"
              value={filters.author}
              onChange={(e) => handleFilterChange('author', e.target.value)}
              placeholder="Enter author username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Media Type
            </label>
            <select
              value={filters.mediaType}
              onChange={(e) => handleFilterChange('mediaType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="gif">GIFs</option>
              <option value="text">Text</option>
              <option value="link">Links</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Score
            </label>
            <input
              type="number"
              value={filters.minScore}
              onChange={(e) => handleFilterChange('minScore', e.target.value)}
              placeholder="Minimum score"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <select
              multiple
              value={filters.tags}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                handleFilterChange('tags', selected);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableTags.map(tag => (
                <option key={tag.id} value={tag.name}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Searches</h3>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    handleFilterChange('search', item.query);
                    // Apply saved filters if available
                    if (item.filters) {
                      setFilters(prev => ({ ...prev, ...item.filters }));
                    }
                  }}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                >
                  {item.query || 'No query'} ({item.results_count} results)
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {selectedItems.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-700">
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleDownloadSelected}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Download Selected
            </button>
          </div>
        </div>
      )}

      {/* Content Grid/List */}
      {isSearching ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Searching...</p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map(item => (
            <ContentCard
              key={item.content.id}
              item={item}
              isSelected={selectedItems.has(item.content.id)}
              onSelect={() => handleSelectItem(item.content.id)}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              getMediaIcon={getMediaIcon}
              formatDate={formatDate}
              truncateText={truncateText}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {searchResults.map(item => (
            <ContentListItem
              key={item.content.id}
              item={item}
              isSelected={selectedItems.has(item.content.id)}
              onSelect={() => handleSelectItem(item.content.id)}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              getMediaIcon={getMediaIcon}
              formatDate={formatDate}
              truncateText={truncateText}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <span className="text-sm text-gray-600">
            Page {currentPage + 1} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage === totalPages - 1}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {searchResults.length === 0 && !isSearching && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No content found</h3>
          <p className="text-gray-600">
            Try adjusting your filters or search terms
          </p>
        </div>
      )}
    </div>
  );
};

interface ContentCardProps {
  item: SearchResult;
  isSelected: boolean;
  onSelect: () => void;
  onAddTag: (contentId: string, tagName: string) => void;
  onRemoveTag: (contentId: string, tagName: string) => void;
  getMediaIcon: (type?: string) => string;
  formatDate: (timestamp: number) => string;
  truncateText: (text: string, maxLength: number) => string;
}

const ContentCard: React.FC<ContentCardProps> = ({
  item,
  isSelected,
  onSelect,
  onAddTag,
  onRemoveTag,
  getMediaIcon,
  formatDate,
  truncateText
}) => {
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(item.content.id, newTag.trim());
      setNewTag('');
      setShowTagInput(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border-2 cursor-pointer transition-all ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-2xl">{getMediaIcon(item.media[0]?.type)}</span>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
          {truncateText(item.content.title, 80)}
        </h3>
        
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center">
            <span className="font-medium">r/{item.content.subreddit}</span>
            <span className="mx-2">•</span>
            <span>u/{item.content.author}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{formatDate(item.content.created_utc)}</span>
            <span>Score: {item.content.score}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="mt-3">
          <div className="flex flex-wrap gap-1 mb-2">
            {item.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center"
              >
                {tag}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveTag(item.content.id, tag);
                  }}
                  className="ml-1 text-blue-500 hover:text-blue-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          
          {showTagInput ? (
            <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Tag name"
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                autoFocus
              />
              <button
                onClick={handleAddTag}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => setShowTagInput(false)}
                className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTagInput(true);
              }}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              + Add tag
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface ContentListItemProps {
  item: SearchResult;
  isSelected: boolean;
  onSelect: () => void;
  onAddTag: (contentId: string, tagName: string) => void;
  onRemoveTag: (contentId: string, tagName: string) => void;
  getMediaIcon: (type?: string) => string;
  formatDate: (timestamp: number) => string;
  truncateText: (text: string, maxLength: number) => string;
}

const ContentListItem: React.FC<ContentListItemProps> = ({
  item,
  isSelected,
  onSelect,
  onAddTag,
  onRemoveTag,
  getMediaIcon,
  formatDate,
  truncateText
}) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border-2 cursor-pointer transition-all ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="p-4">
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            onClick={(e) => e.stopPropagation()}
          />
          
          <span className="text-xl">{getMediaIcon(item.media[0]?.type)}</span>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 mb-1">
              {truncateText(item.content.title, 120)}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>r/{item.content.subreddit}</span>
              <span>u/{item.content.author}</span>
              <span>{formatDate(item.content.created_utc)}</span>
              <span>Score: {item.content.score}</span>
            </div>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-1 mt-2">
              {item.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center"
                >
                  {tag}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTag(item.content.id, tag);
                    }}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 