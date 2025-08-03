import React, { useState, useMemo } from 'react';
import type { ContentItem } from '../services/contentService';
import { MediaUtils } from '../utils/mediaUtils';

interface ContentBrowserProps {
  items: ContentItem[];
  onDownloadRequest?: (items: ContentItem[]) => void;
}

interface FilterState {
  search: string;
  subreddit: string;
  mediaType: string;
  author: string;
}

export const ContentBrowser: React.FC<ContentBrowserProps> = ({ items, onDownloadRequest }) => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    subreddit: '',
    mediaType: '',
    author: ''
  });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Get unique values for filter dropdowns
  const subreddits = useMemo(() => 
    [...new Set(items.map(item => item.subreddit))].sort(), 
    [items]
  );
  
  const authors = useMemo(() => 
    [...new Set(items.map(item => item.author))].sort(), 
    [items]
  );

  const mediaTypes = useMemo(() => 
    [...new Set(items.map(item => item.media?.type).filter(Boolean))].sort(), 
    [items]
  );

  // Filter items based on current filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const searchText = `${item.title} ${item.subreddit} ${item.author}`.toLowerCase();
      
      if (filters.search && !searchText.includes(filters.search.toLowerCase())) {
        return false;
      }
      
      if (filters.subreddit && item.subreddit !== filters.subreddit) {
        return false;
      }
      
      if (filters.mediaType && item.media?.type !== filters.mediaType) {
        return false;
      }
      
      if (filters.author && item.author !== filters.author) {
        return false;
      }
      
      return true;
    });
  }, [items, filters]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
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
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleDownloadSelected = () => {
    const selectedContentItems = filteredItems.filter(item => selectedItems.has(item.id));
    onDownloadRequest?.(selectedContentItems);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saved Content</h1>
          <p className="text-gray-600">
            {filteredItems.length} of {items.length} items
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

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search titles, subreddits, authors..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subreddit
            </label>
            <select
              value={filters.subreddit}
              onChange={(e) => handleFilterChange('subreddit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Subreddits</option>
              {subreddits.map(subreddit => (
                <option key={subreddit} value={subreddit}>
                  r/{subreddit}
                </option>
              ))}
            </select>
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
              {mediaTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Author
            </label>
            <select
              value={filters.author}
              onChange={(e) => handleFilterChange('author', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Authors</option>
              {authors.map(author => (
                <option key={author} value={author}>
                  u/{author}
                </option>
              ))}
            </select>
          </div>
        </div>
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
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <ContentCard
              key={item.id}
              item={item}
              isSelected={selectedItems.has(item.id)}
              onSelect={() => handleSelectItem(item.id)}
              getMediaIcon={getMediaIcon}
              formatDate={formatDate}
              truncateText={truncateText}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map(item => (
            <ContentListItem
              key={item.id}
              item={item}
              isSelected={selectedItems.has(item.id)}
              onSelect={() => handleSelectItem(item.id)}
              getMediaIcon={getMediaIcon}
              formatDate={formatDate}
              truncateText={truncateText}
            />
          ))}
        </div>
      )}

      {filteredItems.length === 0 && (
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
  item: ContentItem;
  isSelected: boolean;
  onSelect: () => void;
  getMediaIcon: (type?: string) => string;
  formatDate: (timestamp: number) => string;
  truncateText: (text: string, maxLength: number) => string;
}

const ContentCard: React.FC<ContentCardProps> = ({
  item,
  isSelected,
  onSelect,
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
        <div className="flex items-start justify-between mb-2">
          <span className="text-2xl">{getMediaIcon(item.media?.type)}</span>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
          {truncateText(item.title, 80)}
        </h3>
        
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center">
            <span className="font-medium">r/{item.subreddit}</span>
            <span className="mx-2">•</span>
            <span>u/{item.author}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{formatDate(item.created_utc)}</span>
            <span>Score: {item.metadata.score}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ContentListItemProps {
  item: ContentItem;
  isSelected: boolean;
  onSelect: () => void;
  getMediaIcon: (type?: string) => string;
  formatDate: (timestamp: number) => string;
  truncateText: (text: string, maxLength: number) => string;
}

const ContentListItem: React.FC<ContentListItemProps> = ({
  item,
  isSelected,
  onSelect,
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
          
          <span className="text-xl">{getMediaIcon(item.media?.type)}</span>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 mb-1">
              {truncateText(item.title, 120)}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>r/{item.subreddit}</span>
              <span>u/{item.author}</span>
              <span>{formatDate(item.created_utc)}</span>
              <span>Score: {item.metadata.score}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 