import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Edit3, 
  Trash2, 
  Eye,
  Package,
  BarChart3,
  Users,
  DollarSign
} from 'lucide-react';

import { Product } from '../types';
import { ProductUploadForm } from '../components/admin/ProductUploadForm';
import { adminApi } from '../services/api';
import toast from 'react-hot-toast';

interface AdminDashboardProps {}

type AdminView = 'overview' | 'products' | 'upload' | 'analytics' | 'view-product' | 'edit-product';

interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  avgRating: number;
  totalValue: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const [currentView, setCurrentView] = useState<AdminView>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  // const [loading, setLoading] = useState(false); // Removed unused variable
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCategories: 0,
    avgRating: 0,
    totalValue: 0
  });

  const navigation = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'upload', label: 'Add Product', icon: Plus },
    { id: 'analytics', label: 'Analytics', icon: Users },
  ];

  // Load products and stats
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    // setLoading(true); // Loading state temporarily removed
    try {
      // Load products from API
      const result = await adminApi.getAllProducts({
        page: 1,
        limit: 50,
        search: searchQuery
      });
      
      setProducts(result.products);
      
      // Calculate stats
      setStats({
        totalProducts: result.products.length,
        totalCategories: new Set(result.products.map(p => p.category)).size,
        avgRating: result.products.length > 0 
          ? result.products.reduce((acc, p) => acc + p.rating, 0) / result.products.length
          : 0,
        totalValue: result.products.reduce((acc, p) => acc + p.price.max, 0)
      });
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      // setLoading(false); // Loading state temporarily removed
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Action handlers
  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentView('view-product');
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setCurrentView('edit-product');
  };

  const handleDeleteProduct = async (product: Product) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      try {
        await adminApi.deleteProduct(product.id);
        toast.success('Product deleted successfully');
        loadProducts(); // Refresh the list
      } catch (error) {
        console.error('Failed to delete product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalProducts}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalCategories}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Users className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Rating</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.avgRating.toFixed(1)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-semibold text-gray-900">${stats.totalValue.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setCurrentView('upload')}
            className="flex items-center justify-center space-x-2 p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5 text-primary-600" />
            <span className="font-medium text-primary-700">Add New Product</span>
          </button>
          
          <button
            onClick={() => setCurrentView('products')}
            className="flex items-center justify-center space-x-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Package className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-700">Manage Products</span>
          </button>
          
          <button className="flex items-center justify-center space-x-2 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
            <Download className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-700">Export Data</span>
          </button>
        </div>
      </motion.div>
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-6">
      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
          <button
            onClick={() => setCurrentView('upload')}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product, index) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={`http://localhost:3001${product.images[0]}`}
                            alt={product.name}
                            className="h-12 w-12 rounded-lg object-cover"
                            onError={(e) => {
                              // Fallback to placeholder if image fails to load
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                const placeholder = document.createElement('div');
                                placeholder.className = 'h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center';
                                placeholder.innerHTML = '<svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-2.18l-1.1-2H7.28L6.18 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>';
                                parent.appendChild(placeholder);
                              }
                            }}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.price.display}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{product.rating}/100</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleViewProduct(product)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                        title="View Product"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEditProduct(product)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Edit Product"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderViewProduct = () => {
    if (!selectedProduct) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentView('products')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <span>← Back to Products</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedProduct.name}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Brand</label>
                  <p className="text-gray-900">{selectedProduct.brand}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <p className="text-gray-900">{selectedProduct.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <p className="text-gray-900">{selectedProduct.price.display}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rating</label>
                  <p className="text-gray-900">{selectedProduct.rating}/100</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="text-gray-900">{selectedProduct.description || 'No description available'}</p>
                </div>
              </div>
            </div>
            <div>
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedProduct.images.map((image, index) => (
                      <img
                        key={index}
                        src={`http://localhost:3001${image}`}
                        alt={`${selectedProduct.name} ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEditProduct = () => {
    if (!editingProduct) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentView('products')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <span>← Back to Products</span>
          </button>
        </div>

        <ProductUploadForm
          initialData={editingProduct}
          onSubmit={(data) => {
            console.log('Product updated:', data);
            loadProducts();
            setCurrentView('products');
            setEditingProduct(null);
          }}
          onCancel={() => {
            setCurrentView('products');
            setEditingProduct(null);
          }}
        />
      </div>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return renderOverview();
      case 'products':
        return renderProducts();
      case 'upload':
        return <ProductUploadForm onSubmit={(data) => {
          console.log('New product created:', data);
          // Product is already created by the form, just refresh the list
          loadProducts();
          // Switch back to products view to see the new product
          setCurrentView('products');
        }} />;
      case 'view-product':
        return renderViewProduct();
      case 'edit-product':
        return renderEditProduct();
      case 'analytics':
        return <div className="text-center py-12">Analytics Dashboard - Coming Soon!</div>;
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Manage your product inventory</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Upload className="w-4 h-4" />
                <span>Import CSV</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id as AdminView)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        currentView === item.id
                          ? 'bg-primary-100 text-primary-700 border border-primary-200'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};