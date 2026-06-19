import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
  ScrollView
} from "react-native";
import { Search, Briefcase, MapPin, DollarSign, Filter, ChevronRight } from "lucide-react-native";
import { getJobsRequest, getCategoriesRequest, Job, JobCategory } from "../service";
import { NativeStackScreenProps } from "@react-navigation/native-stack";


type RootStackParamList = {
  Jobs: undefined;
  JobDetail: { jobId: number };
  Messages: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "Jobs">;

export function JobListScreen({ navigation }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const [jobsData, categoriesData] = await Promise.all([
        getJobsRequest(),
        getCategoriesRequest()
      ]);
      setJobs(jobsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase()) || 
                         (job.company_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory ? job.category_id === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const renderJobItem = ({ item }: { item: Job }) => (
    <Pressable 
      style={styles.jobCard}
      onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Briefcase size={20} color="#38bdf8" />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.companyName}>{item.company_name || "MessenjrAli Hamkori"}</Text>
        </View>
        <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.infoTag}>
          <MapPin size={12} color="rgba(255,255,255,0.5)" />
          <Text style={styles.tagName}>{item.location || "O'zbekiston"}</Text>
        </View>
        <View style={styles.infoTag}>
          <DollarSign size={12} color="#4ade80" />
          <Text style={[styles.tagName, { color: "#4ade80" }]}>
            {item.salary_min ? `${item.salary_min} MALI` : "Kelishiladi"}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ish E'lonlari</Text>
        <Text style={styles.headerSubtitle}>O'zingizga mos ishni toping</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Search size={20} color="rgba(255,255,255,0.4)" />
          <TextInput
            placeholder="Pozitsiya yoki kompaniya..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <Pressable style={styles.filterBtn}>
          <Filter size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Categories */}
      <View style={styles.categoriesSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          <Pressable 
            style={[styles.categoryCard, !selectedCategory && styles.categoryCardActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>Hammasi</Text>
          </Pressable>
          {categories.map(cat => (
            <Pressable 
              key={cat.id} 
              style={[styles.categoryCard, selectedCategory === cat.id && styles.categoryCardActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
                {cat.name_uz}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Job List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#0ea5e9" size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={item => item.id.toString()}
          renderItem={renderJobItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Hozircha hech narsa topilmadi</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  header: { paddingHorizontal: 24, paddingVertical: 16 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 4 },
  searchContainer: { flexDirection: "row", paddingHorizontal: 20, marginBottom: 16, alignItems: "center" },
  searchWrapper: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  searchInput: { flex: 1, color: "#fff", marginLeft: 10, fontSize: 15 },
  filterBtn: { width: 50, height: 50, backgroundColor: "#0ea5e9", borderRadius: 16, marginLeft: 12, justifyContent: "center", alignItems: "center", shadowColor: "#0ea5e9", shadowOpacity: 0.3, shadowRadius: 10 },
  categoriesSection: { marginBottom: 16 },
  categoryScroll: { paddingHorizontal: 20 },
  categoryCard: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", marginRight: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  categoryCardActive: { backgroundColor: "#0ea5e9", borderColor: "#0ea5e9" },
  categoryText: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "700" },
  categoryTextActive: { color: "#fff" },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  jobCard: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  iconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(56, 189, 248, 0.1)", justifyContent: "center", alignItems: "center", marginRight: 12 },
  titleContainer: { flex: 1 },
  jobTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  companyName: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2 },
  cardFooter: { flexDirection: "row", alignItems: "center" },
  infoTag: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 10 },
  tagName: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700", marginLeft: 6 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center", marginTop: 50 },
  emptyText: { color: "rgba(255,255,255,0.3)", fontSize: 16 }
});


