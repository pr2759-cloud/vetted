import React, { useState } from 'react';
import { 
  Image as ImageIcon, 
  X, 
  Plus,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../services/api';

interface CustomerReview {
  text: string;
  rating: number;
  author?: string;
  date?: string;
}

interface ProductFormData {
  name: string;
  description: string;
  brand: string;
  category: string;
  priceMin: number;
  priceMax: number;
  rating: number;
  reviewCount: number;
  tags: string[];
  images: File[];
  customerReviews: CustomerReview[];
  features: string[];
  availability: string;
}

interface ProductUploadFormProps {
  onSubmit?: (data: ProductFormData) => void;
  onCancel?: () => void;
  initialData?: any; // Product data for editing
}

export const ProductUploadForm: React.FC<ProductUploadFormProps> = ({
  onSubmit,
  onCancel,
  initialData
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    brand: initialData?.brand || '',
    category: initialData?.category || '',
    priceMin: initialData?.price?.min || 0,
    priceMax: initialData?.price?.max || 0,
    rating: initialData?.rating || 0,
    reviewCount: initialData?.reviewCount || 0,
    tags: initialData?.tags || [],
    images: [],
    customerReviews: [],
    features: initialData?.features || [],
    availability: initialData?.availability || 'in_stock'
  });

  const [currentTag, setCurrentTag] = useState('');
  const [currentFeature, setCurrentFeature] = useState('');
  const [currentReview, setCurrentReview] = useState<CustomerReview>({
    text: '',
    rating: 5,
    author: '',
    date: ''
  });
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    'Skincare & Beauty',
    'Tech Accessories', 
    'Fitness & Wellness',
    'Home & Kitchen',
    "Men's Grooming",
    'Electronics',
    'Health & Nutrition',
    'Fashion & Accessories',
    'Books & Media',
    'Sports & Outdoors'
  ];


  const availabilityOptions = [
    { value: 'in_stock', label: 'In Stock' },
    { value: 'out_of_stock', label: 'Out of Stock' },
    { value: 'limited', label: 'Limited Stock' }
  ];

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addFeature = () => {
    if (currentFeature.trim() && !formData.features.includes(currentFeature.trim())) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, currentFeature.trim()]
      }));
      setCurrentFeature('');
    }
  };

  const removeFeature = (featureToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter(feature => feature !== featureToRemove)
    }));
  };

  const addReview = () => {
    if (currentReview.text.trim()) {
      const reviewToAdd = {
        ...currentReview,
        text: currentReview.text.trim(),
        author: currentReview.author?.trim() || 'Anonymous',
        date: currentReview.date || new Date().toISOString().split('T')[0]
      };
      
      setFormData(prev => ({
        ...prev,
        customerReviews: [...prev.customerReviews, reviewToAdd]
      }));
      
      setCurrentReview({
        text: '',
        rating: 5,
        author: '',
        date: ''
      });
    }
  };

  const removeReview = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customerReviews: prev.customerReviews.filter((_, i) => i !== index)
    }));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...imageFiles].slice(0, 10) // Limit to 10 images
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Product name is required');
      }
      if (!formData.category) {
        throw new Error('Category is required');
      }
      if (formData.priceMin <= 0 || formData.priceMax <= 0) {
        throw new Error('Valid price range is required');
      }
      if (formData.priceMin > formData.priceMax) {
        throw new Error('Minimum price cannot be greater than maximum price');
      }

      // Prepare form data for API
      const apiFormData = new FormData();
      
      // Add basic product information
      apiFormData.append('name', formData.name);
      apiFormData.append('description', formData.description);
      apiFormData.append('brand', formData.brand);
      apiFormData.append('category', formData.category);
      apiFormData.append('priceMin', formData.priceMin.toString());
      apiFormData.append('priceMax', formData.priceMax.toString());
      apiFormData.append('rating', formData.rating.toString());
      apiFormData.append('reviewCount', formData.reviewCount.toString());
      apiFormData.append('availability', formData.availability);
      
      // Add tags and features as comma-separated strings
      apiFormData.append('tags', formData.tags.join(','));
      apiFormData.append('features', formData.features.join(','));
      
      // Add customer reviews as JSON string
      apiFormData.append('customerReviews', JSON.stringify(formData.customerReviews));
      
      // Add image files
      formData.images.forEach((image, index) => {
        apiFormData.append('images', image, image.name);
      });

      // Call the API (create or update)
      let result;
      if (initialData?.id) {
        result = await adminApi.updateProduct(initialData.id, apiFormData);
        console.log('Product updated successfully:', result);
      } else {
        result = await adminApi.createProduct(apiFormData);
        console.log('Product created successfully:', result);
      }
      
      if (onSubmit) {
        onSubmit(formData);
      }

      toast.success(initialData?.id ? 'Product updated successfully!' : 'Product added successfully!');
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        brand: '',
        category: '',
        priceMin: 0,
        priceMax: 0,
        rating: 0,
        reviewCount: 0,
        tags: [],
        images: [],
        customerReviews: [],
        features: [],
        availability: 'in_stock'
      });

    } catch (error: any) {
      toast.error(error.message || 'Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {initialData?.id ? 'Edit Product' : 'Add New Product'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {initialData?.id 
              ? 'Update the product details below' 
              : 'Fill in the details to add a new product to your inventory'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter brand name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Availability
                </label>
                <select
                  value={formData.availability}
                  onChange={(e) => handleInputChange('availability', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {availabilityOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter product description"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Pricing & Reviews</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Price ($) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.priceMin}
                  onChange={(e) => handleInputChange('priceMin', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Price ($) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.priceMax}
                  onChange={(e) => handleInputChange('priceMax', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.rating}
                  onChange={(e) => handleInputChange('rating', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.reviewCount}
                  onChange={(e) => handleInputChange('reviewCount', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Product Images</h3>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Drop images here or click to upload
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB (Max 10 images)
                  </span>
                </label>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  multiple
                  accept="image/*"
                  onChange={handleFileInput}
                />
              </div>
            </div>

            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Tags & Features</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter a tag"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Features
              </label>
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={currentFeature}
                  onChange={(e) => setCurrentFeature(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter a feature"
                />
                <button
                  type="button"
                  onClick={addFeature}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {formData.features.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.features.map((feature, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                    >
                      <span>{feature}</span>
                      <button
                        type="button"
                        onClick={() => removeFeature(feature)}
                        className="ml-1 hover:bg-green-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Customer Reviews */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Customer Reviews</h3>
            <p className="text-sm text-gray-600">Add customer reviews from various sources. The LLM will analyze these for sentiment.</p>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Author (optional)
                  </label>
                  <input
                    type="text"
                    value={currentReview.author}
                    onChange={(e) => setCurrentReview(prev => ({ ...prev, author: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Customer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating (1-5)
                  </label>
                  <select
                    value={currentReview.rating}
                    onChange={(e) => setCurrentReview(prev => ({ ...prev, rating: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {[5, 4, 3, 2, 1].map(rating => (
                      <option key={rating} value={rating}>
                        {rating} {'★'.repeat(rating)}{'☆'.repeat(5-rating)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date (optional)
                  </label>
                  <input
                    type="date"
                    value={currentReview.date}
                    onChange={(e) => setCurrentReview(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Text
                </label>
                <textarea
                  rows={3}
                  value={currentReview.text}
                  onChange={(e) => setCurrentReview(prev => ({ ...prev, text: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter customer review text..."
                />
              </div>

              <button
                type="button"
                onClick={addReview}
                disabled={!currentReview.text.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Review</span>
              </button>
            </div>

            {formData.customerReviews.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">
                  Added Reviews ({formData.customerReviews.length})
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-3">
                  {formData.customerReviews.map((review, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              {review.author || 'Anonymous'}
                            </span>
                            <span className="text-yellow-500">
                              {'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}
                            </span>
                            {review.date && (
                              <span className="text-xs text-gray-500">
                                {new Date(review.date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-800">{review.text}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeReview(index)}
                          className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{initialData?.id ? 'Updating Product...' : 'Adding Product...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{initialData?.id ? 'Update Product' : 'Add Product'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};